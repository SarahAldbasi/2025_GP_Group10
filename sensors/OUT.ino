#include "dw3000.h"
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ====================== WiFi + MQTT ======================
const char* ssid = "";
const char* password = "";
const char* mqtt_server = "test.mosquitto.org";
const char* CLIENT_ID = "TAG_001_DW3000";

const char* MQTT_TOPIC_STATUS = "uwb/tag_001/status";
const char* MQTT_TOPIC_GOAL   = "goals/00001";
const char* LWT_MESSAGE = "{\"tag_id\":\"TAG_001_DW3000\",\"status\":\"inactive\"}";

WiFiClient espClient;
PubSubClient client(espClient);
unsigned long lastStatusTime = 0;
const long STATUS_INTERVAL = 1000;

// ===================== GOAL LOGIC VARIABLES =====================
unsigned long lastMeanTime = 0;   // timing for goal logic
float distE1[4] = {0}, distE2[4] = {0};
int countE1 = 0, countE2 = 0;
// ================================================================

void setupWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500); Serial.print(".");
  }
  Serial.println("\nWiFi Connected");
}

void reconnectMQTT() {
  while (!client.connected()) {
    Serial.print("Connecting to MQTT...");
    client.setKeepAlive(5);
    if (client.connect(CLIENT_ID, NULL, NULL, MQTT_TOPIC_STATUS, 1, true, LWT_MESSAGE)) {
      Serial.println("connected");
    } else {
      Serial.print("failed rc="); Serial.println(client.state());
      delay(2000);
    }
  }
}

void publishStatus() {
  StaticJsonDocument<200> doc;
  doc["tag_id"] = CLIENT_ID;
  doc["status"] = "active";
  doc["timestamp"] = millis();
  char buffer[100];
  serializeJson(doc, buffer);
  client.publish(MQTT_TOPIC_STATUS, buffer, false);
  Serial.print(" Active Sent → "); Serial.println(buffer);
}

// ====================== DW3000 CONFIG ======================
#define PIN_RST 27
#define PIN_IRQ 34
#define PIN_SS 4

#define RNG_DELAY_MS 250
#define TX_ANT_DLY 16385
#define RX_ANT_DLY 16385

static dwt_config_t config = {
  5, DWT_PLEN_128, DWT_PAC8, 9, 9, 1,
  DWT_BR_6M8, DWT_PHRMODE_STD, DWT_PHRRATE_STD,
  (129 + 8 - 8), DWT_STS_MODE_OFF, DWT_STS_LEN_64, DWT_PDOA_M0};

static uint8_t tx_poll_msg[] = {0x41, 0x88, 0, 0xCA, 0xDE, 'W', 'A', 'V', 'E', 0xE0, 0, 0};
static uint8_t rx_buffer[20];
extern dwt_txconfig_t txconfig_options;

float calcMean(float *arr, int size) {
  float sum = 0;
  for (int i = 0; i < size; i++) sum += arr[i];
  return sum / size;
}

void setup() {
  Serial.begin(115200);
  UART_init();

  setupWiFi();
  client.setServer(mqtt_server, 1883);
  reconnectMQTT();
  publishStatus();

  spiBegin(PIN_IRQ, PIN_RST);
  spiSelect(PIN_SS);

  delay(2);
  if (!dwt_checkidlerc()) { Serial.println("IDLE FAILED"); while(1); }
  if (dwt_initialise(DWT_DW_INIT) == DWT_ERROR) { Serial.println("INIT FAILED"); while(1); }

  dwt_setleds(DWT_LEDS_ENABLE | DWT_LEDS_INIT_BLINK);
  dwt_configure(&config);
  dwt_configuretxrf(&txconfig_options);
  dwt_setrxantennadelay(RX_ANT_DLY);
  dwt_settxantennadelay(TX_ANT_DLY);
  dwt_setrxaftertxdelay(240);
  dwt_setrxtimeout(400);
  dwt_setlnapamode(DWT_LNA_ENABLE | DWT_PA_ENABLE);

  Serial.println(" Ready to read distances...");
}

void loop() {
  if (!client.connected()) reconnectMQTT();
  client.loop();
  if (millis() - lastStatusTime >= STATUS_INTERVAL) {
    lastStatusTime = millis();
    publishStatus();
  }

  // Send POLL
  tx_poll_msg[2]++;
  dwt_write32bitreg(SYS_STATUS_ID, SYS_STATUS_TXFRS_BIT_MASK);
  dwt_writetxdata(sizeof(tx_poll_msg), tx_poll_msg, 0);
  dwt_writetxfctrl(sizeof(tx_poll_msg), 0, 1);
  dwt_starttx(DWT_START_TX_IMMEDIATE | DWT_RESPONSE_EXPECTED);

  // Wait response
  uint32_t status_reg;
  while (!((status_reg = dwt_read32bitreg(SYS_STATUS_ID)) &
          (SYS_STATUS_RXFCG_BIT_MASK | SYS_STATUS_ALL_RX_TO | SYS_STATUS_ALL_RX_ERR)));

  if (status_reg & SYS_STATUS_RXFCG_BIT_MASK) {
    dwt_write32bitreg(SYS_STATUS_ID, SYS_STATUS_RXFCG_BIT_MASK);
    uint32_t frame_len = dwt_read32bitreg(RX_FINFO_ID) & 0x7F;
    if (frame_len <= sizeof(rx_buffer)) {
      dwt_readrxdata(rx_buffer, frame_len, 0);

      uint8_t anchorID = rx_buffer[9];

      if (anchorID == 0xE1 || anchorID == 0xE2) {
        // timestamps
        uint32_t poll_tx_ts = dwt_readtxtimestamplo32();
        uint32_t resp_rx_ts = dwt_readrxtimestamplo32();

        uint32_t poll_rx_ts, resp_tx_ts;
        resp_msg_get_ts(&rx_buffer[10], &poll_rx_ts);
        resp_msg_get_ts(&rx_buffer[14], &resp_tx_ts);

        float clockOffsetRatio = ((float)dwt_readclockoffset()) / (uint32_t)(1 << 26);

        int32_t rtd_init = resp_rx_ts - poll_tx_ts;
        int32_t rtd_resp = resp_tx_ts - poll_rx_ts;

        double tof = ((rtd_init - rtd_resp * (1 - clockOffsetRatio)) / 2.0) * DWT_TIME_UNITS;
        double distance = tof * SPEED_OF_LIGHT;

        // store 4-sample rolling means
        if (anchorID == 0xE1) distE1[countE1++ % 4] = distance;
        if (anchorID == 0xE2) distE2[countE2++ % 4] = distance;
      }
    }
  }

  // ===================== GOAL LOGIC (Added) =====================
  if (millis() - lastMeanTime >= 1000) {
    lastMeanTime = millis();

    float meanE1 = calcMean(distE1, 4);
    float meanE2 = calcMean(distE2, 4);

    float inA1 = meanE1;
    float inA2 = meanE2;


    Serial.println("\n------------------------------");
    Serial.print(" Anchor E1 Mean: "); Serial.println(inA1, 2);
    Serial.print(" Anchor E2 Mean: "); Serial.println(inA2, 2);

    if (inA1 < 0.40) {
      Serial.println("OUT");
      client.publish(MQTT_TOPIC_GOAL, "OUT", false);

    } 
     else {
      Serial.println("IN PLAY");
    }
  
  // =============================================================

  Sleep(RNG_DELAY_MS);
}
