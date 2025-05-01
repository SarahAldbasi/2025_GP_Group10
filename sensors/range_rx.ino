#include <WiFi.h>
#include <PubSubClient.h>
#include <HTTPClient.h>
#include "dw3000.h"
#include <math.h>

// Wi-Fi credentials
const char* ssid = "reem";
const char* password = "12345678";

// MQTT
const char* mqtt_server = "test.mosquitto.org";
const char* topic_distances = "goals/distances";

WiFiClient espClient;
PubSubClient client(espClient);

#define PIN_RST 27
#define PIN_IRQ 34
#define PIN_SS 4

#define RNG_DELAY_MS 10
#define TX_ANT_DLY 16385
#define RX_ANT_DLY 16385
#define ALL_MSG_COMMON_LEN 10
#define ALL_MSG_SN_IDX 2
#define RESP_MSG_POLL_RX_TS_IDX 10
#define RESP_MSG_RESP_TX_TS_IDX 14
#define RESP_MSG_ANCHOR_ID_IDX 17
#define RESP_MSG_TS_LEN 4
#define POLL_TX_TO_RESP_RX_DLY_UUS 240
#define RESP_RX_TIMEOUT_UUS 400

static dwt_config_t config = {
  5, DWT_PLEN_128, DWT_PAC8, 9, 9, 1,
  DWT_BR_6M8, DWT_PHRMODE_STD, DWT_PHRRATE_STD,
  (129 + 8 - 8), DWT_STS_MODE_OFF, DWT_STS_LEN_64, DWT_PDOA_M0
};

static uint8_t tx_poll_msg[] = {0x41, 0x88, 0, 0xCA, 0xDE, 'W', 'A', 'V', 'E', 0xE0, 0, 0};
static uint8_t rx_resp_msg[] = {0x41, 0x88, 0, 0xCA, 0xDE, 'V', 'E', 'W', 'A', 0xE1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0};
static uint8_t frame_seq_nb = 0;
static uint8_t rx_buffer[20];
static uint32_t status_reg = 0;
static double distances[4] = {0, 0, 0, 0};

extern dwt_txconfig_t txconfig_options;

void resp_msg_get_ts(const uint8_t *ts_field, uint32_t *ts) {
  *ts = 0;
  for (int i = 0; i < RESP_MSG_TS_LEN; i++) {
    *ts += ts_field[i] << (i * 8);
  }
}

void reconnect() {
  if (!client.connected()) {
    Serial.print("Connecting to MQTT...");
    if (client.connect("ESP32Client-s")) { // changed this old was "ESP32Client"
      Serial.println("connected!");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      delay(3000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) delay(500);
  client.setServer(mqtt_server, 1883);

  spiBegin(PIN_IRQ, PIN_RST);
  spiSelect(PIN_SS);
  delay(2);
  if (!dwt_checkidlerc() || dwt_initialise(DWT_DW_INIT) == DWT_ERROR) while (1);
  dwt_setleds(DWT_LEDS_ENABLE | DWT_LEDS_INIT_BLINK);
  dwt_configure(&config);
  dwt_configuretxrf(&txconfig_options);
  dwt_setrxantennadelay(RX_ANT_DLY);
  dwt_settxantennadelay(TX_ANT_DLY);
  dwt_setrxaftertxdelay(POLL_TX_TO_RESP_RX_DLY_UUS);
  dwt_setrxtimeout(RESP_RX_TIMEOUT_UUS);
  dwt_setlnapamode(DWT_LNA_ENABLE | DWT_PA_ENABLE);
}

void loop() {
  reconnect();
  client.loop();

  tx_poll_msg[ALL_MSG_SN_IDX] = frame_seq_nb;
  dwt_write32bitreg(SYS_STATUS_ID, SYS_STATUS_TXFRS_BIT_MASK);
  dwt_writetxdata(sizeof(tx_poll_msg), tx_poll_msg, 0);
  dwt_writetxfctrl(sizeof(tx_poll_msg), 0, 1);
  dwt_starttx(DWT_START_TX_IMMEDIATE | DWT_RESPONSE_EXPECTED);

  while (!((status_reg = dwt_read32bitreg(SYS_STATUS_ID)) & 
    (SYS_STATUS_RXFCG_BIT_MASK | SYS_STATUS_ALL_RX_TO | SYS_STATUS_ALL_RX_ERR))) {}

  frame_seq_nb++;

  if (status_reg & SYS_STATUS_RXFCG_BIT_MASK) {
    uint32_t frame_len = dwt_read32bitreg(RX_FINFO_ID) & RXFLEN_MASK;
    if (frame_len <= sizeof(rx_buffer)) {
      dwt_readrxdata(rx_buffer, frame_len, 0);
      rx_buffer[ALL_MSG_SN_IDX] = 0;

      if (memcmp(rx_buffer, rx_resp_msg, ALL_MSG_COMMON_LEN) == 0) {
        uint8_t anchor_id = rx_buffer[RESP_MSG_ANCHOR_ID_IDX];
        if (anchor_id >= 1 && anchor_id <= 3) {
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

          double tof = ((rtd_init - rtd_resp * (1 - clockOffsetRatio)) / 2.0) * DWT_TIME_UNITS;
          distances[anchor_id] = tof * SPEED_OF_LIGHT;
          Serial.printf("Anchor %d Distance: %.2f m\n", anchor_id, distances[anchor_id]);
        }
      }

      if (distances[1] > 0 && distances[2] > 0 && distances[3] > 0) {
        String payload = "{";
        payload += "\"d1\":" + String(distances[1], 3) + ",";
        payload += "\"d2\":" + String(distances[2], 3) + ",";
        payload += "\"d3\":" + String(distances[3], 3);
        payload += "}";

        client.publish(topic_distances, payload.c_str());
        Serial.println("📤 Distances sent to watch: " + payload);

        distances[1] = distances[2] = distances[3] = 0;
      }
    }
    dwt_write32bitreg(SYS_STATUS_ID, SYS_STATUS_RXFCG_BIT_MASK);
  } else {
    dwt_write32bitreg(SYS_STATUS_ID, SYS_STATUS_ALL_RX_TO | SYS_STATUS_ALL_RX_ERR);
  }

  delay(RNG_DELAY_MS);
}