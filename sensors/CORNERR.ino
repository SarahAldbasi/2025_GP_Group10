#include "dw3000.h"
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>   

#define PIN_RST 27
#define PIN_IRQ 34
#define PIN_SS  4

#define RNG_DELAY_MS 250  // كل ربع ثانية قراءة
#define TX_ANT_DLY 16385
#define RX_ANT_DLY 16385
#define ALL_MSG_COMMON_LEN 10
#define ALL_MSG_SN_IDX 2
#define RESP_MSG_POLL_RX_TS_IDX 10
#define RESP_MSG_RESP_TX_TS_IDX 14
#define RESP_MSG_TS_LEN 4
#define POLL_TX_TO_RESP_RX_DLY_UUS 240
#define RESP_RX_TIMEOUT_UUS 400

// WiFi
const char* ssid = "";
const char* password = "";

// MQTT
const char* mqtt_server = "test.mosquitto.org";
WiFiClient espClient;
PubSubClient client(espClient);

// NEW: Tag ID + Status Topic + LWT
const char* CLIENT_ID = "TAG_001_DW3000";
const char* MQTT_TOPIC_STATUS = "uwb/tag_001/status";
const char* LWT_MESSAGE = "{\"tag_id\":\"TAG_001_DW3000\",\"status\":\"inactive\"}";

// NEW: active status timer
unsigned long lastStatusTime = 0;
const long STATUS_INTERVAL = 1000;

// إعدادات DW3000
static dwt_config_t config = {
    5, DWT_PLEN_128, DWT_PAC8, 9, 9, 1,
    DWT_BR_6M8, DWT_PHRMODE_STD, DWT_PHRRATE_STD,
    (129 + 8 - 8), DWT_STS_MODE_OFF, DWT_STS_LEN_64, DWT_PDOA_M0};

static uint8_t tx_poll_msg[] = {0x41, 0x88, 0, 0xCA, 0xDE, 'W', 'A', 'V', 'E', 0xE0, 0, 0};
static uint8_t rx_resp_msg[] = {0x41, 0x88, 0, 0xCA, 0xDE, 'V', 'E', 'W', 'A', 0xE1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0};
static uint8_t frame_seq_nb = 0;
static uint8_t rx_buffer[20];
static uint32_t status_reg = 0;
static double tof;
static double distance;
extern dwt_txconfig_t txconfig_options;

// لتخزين 4 قراءات لكل أنكر (E1 = C0 ، E2 = A1)
float distE1[4] = {0}, distE2[4] = {0};
int countE1 = 0, countE2 = 0;
unsigned long lastMeanTime = 0;

void setupWiFi() {
  Serial.print("Connecting to WiFi...");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected ");
}

// UPDATED: MQTT reconnect with LWT
void reconnectMQTT() {
  while (!client.connected()) {
    Serial.print("Connecting to MQTT...");
    client.setKeepAlive(5); // NEW

    if (client.connect(
          CLIENT_ID,
          NULL, NULL,
          MQTT_TOPIC_STATUS,
          1, true,
          LWT_MESSAGE))     // NEW LWT
    {
      Serial.println(" connected ");
    } else {
      Serial.print(" failed, rc=");
      Serial.print(client.state());
      Serial.println(" retrying in 3 seconds...");
      delay(3000);
    }
  }
}

// NEW: publish active status
void publishStatus() {
  StaticJsonDocument<200> doc;
  doc["tag_id"] = CLIENT_ID;
  doc["status"] = "active";
  doc["timestamp"] = millis();

  char buffer[150];
  serializeJson(doc, buffer);

  client.publish(MQTT_TOPIC_STATUS, buffer, false);
  Serial.print("📡 Active Sent → ");
  Serial.println(buffer);
}

// ========= ثوابت الكورنر =========
// E1 = C0 (الركنية)  → نستخدم meanE1 كـ dC0
// E2 = A1 (داخل الملعب) → نستخدم meanE2 كـ dA1
const float R_CORNER = 0.58f;      // نصف قطر الركنية (1 يارد)
const float TOL_R    = 0.10f;       // سماحية نصف القطر
const float L_A1     = 0.60f;       // المسافة بين C0 و A1 (قيسيها في الواقع)
const float COS45    = 0.70710678f; // cos(45°)
const float TOL_ANG  = 0.08f;       // سماحية للزاوية
const float R_NEAR0  = 0.05f;       // تجنّب القسمة على صفر

float calcMean(float *arr, int size) {
  float sum = 0;
  for (int i = 0; i < size; i++) sum += arr[i];
  return sum / size;
}
extern PubSubClient client;

// ========= دالة الكورنر =========
// (UNCHANGED EXACTLY)
void checkCornerPlacement(float dC0, float dA1) {
  float r = dC0;

  bool withinArc = (r <= (R_CORNER + TOL_R));
  bool withinSector = true;

  if (r > R_NEAR0) {
    float num = r*r + L_A1*L_A1 - dA1*dA1;
    float den = 2.0f * r * L_A1;
    float cosTheta = num / den;

    if (cosTheta > 1.0f) cosTheta = 1.0f;
    if (cosTheta < -1.0f) cosTheta = -1.0f;

    withinSector = (cosTheta >= (COS45 - TOL_ANG));
  }

  Serial.println("===== Corner Check =====");
  Serial.print("dC0 (E1/C0) = "); Serial.print(dC0, 3);
  Serial.print(" m | dA1 (E2/A1) = "); Serial.print(dA1, 3); Serial.println(" m");
  Serial.print("داخل نصف القطر: "); Serial.println(withinArc ? "نعم" : "لا");
  Serial.print("داخل القطاع: ");    Serial.println(withinSector ? "نعم" : "لا");

  if (withinArc && withinSector) {
    Serial.println(" النتيجة: LEGAL (وضع الكرة قانوني داخل الركنية)");
  } 
  else if (!withinArc) {
    Serial.println(" النتيجة: OUT_OF_ARC (الكرة خارج ربع دائرة الركنية)");
    client.publish("goals/00001", "CORNER");
  } 
  else {
    Serial.println(" النتيجة: OUT_OF_SECTOR (اتجاه الكرة خاطئ، مثلاً خلف المرمى)");
    client.publish("goals/00001", "CORNER");
  }

  Serial.println();
}

void setup() {
  Serial.begin(115200);
  setupWiFi();

  client.setServer(mqtt_server, 1883);
  reconnectMQTT();
  publishStatus();   

  UART_init();

  spiBegin(PIN_IRQ, PIN_RST);
  spiSelect(PIN_SS);

  delay(2);
  while (!dwt_checkidlerc()) {
    UART_puts("IDLE FAILED\r\n");
    while (1);
  }

  if (dwt_initialise(DWT_DW_INIT) == DWT_ERROR) {
    UART_puts("INIT FAILED\r\n");
    while (1);
  }

  dwt_setleds(DWT_LEDS_ENABLE | DWT_LEDS_INIT_BLINK);
  if (dwt_configure(&config)) {
    UART_puts("CONFIG FAILED\r\n");
    while (1);
  }

  dwt_configuretxrf(&txconfig_options);
  dwt_setrxantennadelay(RX_ANT_DLY);
  dwt_settxantennadelay(TX_ANT_DLY);
  dwt_setrxaftertxdelay(POLL_TX_TO_RESP_RX_DLY_UUS);
  dwt_setrxtimeout(RESP_RX_TIMEOUT_UUS);
  dwt_setlnapamode(DWT_LNA_ENABLE | DWT_PA_ENABLE);

  Serial.println("Tag + Dual Anchor + Corner Detection Ready ");
}

void loop() {

  if (!client.connected()) reconnectMQTT();
  client.loop();

  // NEW: Publish ACTIVE every 1 second
  if (millis() - lastStatusTime >= STATUS_INTERVAL) {
    lastStatusTime = millis();
    publishStatus();
  }

  // إرسال Poll
  tx_poll_msg[ALL_MSG_SN_IDX] = frame_seq_nb;
  dwt_write32bitreg(SYS_STATUS_ID, SYS_STATUS_TXFRS_BIT_MASK);
  dwt_writetxdata(sizeof(tx_poll_msg), tx_poll_msg, 0);
  dwt_writetxfctrl(sizeof(tx_poll_msg), 0, 1);
  dwt_starttx(DWT_START_TX_IMMEDIATE | DWT_RESPONSE_EXPECTED);

  // انتظار رد من أي أنكر
  while (!((status_reg = dwt_read32bitreg(SYS_STATUS_ID)) &
          (SYS_STATUS_RXFCG_BIT_MASK | SYS_STATUS_ALL_RX_TO | SYS_STATUS_ALL_RX_ERR)));

  frame_seq_nb++;

  if (status_reg & SYS_STATUS_RXFCG_BIT_MASK) {
    uint32_t frame_len;
    dwt_write32bitreg(SYS_STATUS_ID, SYS_STATUS_RXFCG_BIT_MASK);
    frame_len = dwt_read32bitreg(RX_FINFO_ID) & RXFLEN_MASK;

    if (frame_len <= sizeof(rx_buffer)) {
      dwt_readrxdata(rx_buffer, frame_len, 0);

      // ID الأنكر من البايت 9
      uint8_t anchorID = rx_buffer[9];

      if (anchorID == 0xE1 || anchorID == 0xE2) {
        uint32_t poll_tx_ts, resp_rx_ts, poll_rx_ts, resp_tx_ts;
        int32_t rtd_init, rtd_resp;
        float clockOffsetRatio;

        poll_tx_ts = dwt_readtxtimestamplo32();
        resp_rx_ts = dwt_readrxtimestamplo32();
        clockOffsetRatio = ((float)dwt_readclockoffset()) / (uint32_t)(1 << 26);

        resp_msg_get_ts(&rx_buffer[RESP_MSG_POLL_RX_TS_IDX], &poll_rx_ts);
        resp_msg_get_ts(&rx_buffer[RESP_MSG_RESP_TX_TS_IDX], &resp_tx_ts);

        rtd_init = resp_rx_ts - poll_tx_ts;
        rtd_resp = resp_tx_ts - poll_rx_ts;

        tof = ((rtd_init - rtd_resp * (1 - clockOffsetRatio)) / 2.0) * DWT_TIME_UNITS;
        distance = tof * SPEED_OF_LIGHT;

        if (anchorID == 0xE1) {
          distE1[countE1 % 4] = distance;
          countE1++;
          Serial.print("Anchor E1 (C0) reading: ");
          Serial.print(distance, 3); Serial.println(" m");
        }

        if (anchorID == 0xE2) {
          distE2[countE2 % 4] = distance;
          countE2++;
          Serial.print("Anchor E2 (A1) reading: ");
          Serial.print(distance, 3); Serial.println(" m");
        }
      }
    }
  } else {
    dwt_write32bitreg(SYS_STATUS_ID, SYS_STATUS_ALL_RX_TO | SYS_STATUS_ALL_RX_ERR);
  }

  if (millis() - lastMeanTime >= 1000) {
    lastMeanTime = millis();

    float meanE1 = calcMean(distE1, 4);
    float meanE2 = calcMean(distE2, 4);

    Serial.println("\n------------------------------");
    Serial.print("Anchor E1 (C0) Mean: "); Serial.print(meanE1, 2); Serial.println(" m");
    Serial.print("Anchor E2 (A1) Mean: "); Serial.print(meanE2, 2); Serial.println(" m");
    Serial.println("------------------------------");

    if (meanE1 > 0.0 && meanE2 > 0.0) {
      checkCornerPlacement(meanE1, meanE2);
    } else {
      Serial.println(" ما فيه قراءات كافية من الأنكرين للحكم على الركنية.");
    }
  }

  Sleep(RNG_DELAY_MS);  // كل ربع ثانية
}
