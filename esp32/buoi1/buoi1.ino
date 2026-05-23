#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Adafruit_NeoPixel.h>
#include <WiFi.h>
#include <HTTPClient.h>

// --- CẤU HÌNH OLED & LED ---
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1
#define SCREEN_ADDRESS 0x3C

#define LED_PIN     12
#define NUM_LEDS    60
#define BRIGHTNESS  150

// --- CẤU HÌNH WIFI & SERVER ---
const char* WIFI_SSID     = "SHIN_LAPTOP";
const char* WIFI_PASSWORD = "binh2004";
const char* SERVER_URL    = "http://192.168.137.1:8000/device-readings/ingest";
const char* BUILDING_CODE = "B01";
const char* DEVICE_TEMP   = "temp-01";
const char* DEVICE_MQ2_1  = "mq2-01";
const char* DEVICE_MQ2_2  = "mq2-02";
const char* DEVICE_MQ2_3  = "mq2-03";

// Khởi tạo NeoPixel cho WS2813
Adafruit_NeoPixel strip(NUM_LEDS, LED_PIN, NEO_GRB + NEO_KHZ800);
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

#define ONE_WIRE_BUS 4
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);
#define FIRE_THRESHOLD 50.0

#define BUZZER_PIN 13

const int mq2_1_A = 32; const int mq2_1_D = 33;
const int mq2_2_A = 34; const int mq2_2_D = 26;
const int mq2_3_A = 35; const int mq2_3_D = 16;

unsigned long lastBuzzerToggle = 0;
unsigned long lastUpdate = 0;
unsigned long lastSendTime = 0;
bool buzzerState = false;

// ==================== WiFi ====================
void connectWiFi() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(10, 25);
  display.println("Connecting WiFi...");
  display.display();

  Serial.print("Dang ket noi WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi OK! IP: " + WiFi.localIP().toString());
}

// ==================== HTTP POST ====================
bool postReading(const char* deviceId, const char* sensorType, float value, const char* unit) {
  if (WiFi.status() != WL_CONNECTED) return false;

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");

  String body = "{";
  body += "\"buildingCode\":\"" + String(BUILDING_CODE) + "\",";
  body += "\"deviceId\":\""     + String(deviceId)      + "\",";
  body += "\"sensorType\":\""   + String(sensorType)    + "\",";
  body += "\"value\":"          + String(value, 2)      + ",";
  body += "\"unit\":\""         + String(unit)          + "\",";
  body += "\"timestamp\":\""    + getTimestamp()        + "\"";
  body += "}";

  int httpCode = http.POST(body);
  http.end();

  if (httpCode == 200) {
    Serial.println("[OK] " + String(deviceId) + " = " + String(value));
    return true;
  } else {
    Serial.println("[FAIL] " + String(deviceId) + " code=" + httpCode);
    return false;
  }
}

String getTimestamp() {
  time_t now = time(nullptr);
  if (now < 1000000000) return "2026-01-01T00:00:00";
  struct tm* t = localtime(&now);
  char buf[25];
  strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%S", t);
  return String(buf);
}

// ==================== LED EFFECT ====================
void runChasingEffect(uint32_t color) {
  static int pos = 0;
  strip.clear();
  for (int i = 0; i < 3; i++) {
    strip.setPixelColor((pos + i) % NUM_LEDS, color);
  }
  strip.show();
  pos = (pos + 1) % NUM_LEDS;
}

// ==================== SETUP ====================
void setup() {
  Serial.begin(115200);
  pinMode(mq2_1_D, INPUT); pinMode(mq2_2_D, INPUT); pinMode(mq2_3_D, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  sensors.begin();

  if (!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) for (;;);

  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(15, 25);
  display.println(F("SMART FIRE ALARM"));
  display.display();

  strip.begin();
  strip.setBrightness(BRIGHTNESS);
  strip.show();

  connectWiFi();
  configTime(7 * 3600, 0, "pool.ntp.org");
  delay(1000);
}

// ==================== LOOP ====================
void loop() {
  sensors.requestTemperatures();
  float tempC = sensors.getTempCByIndex(0);

  int d1 = digitalRead(mq2_1_D);
  int d2 = digitalRead(mq2_2_D);
  int d3 = digitalRead(mq2_3_D);

  int a1 = analogRead(mq2_1_A);
  int a2 = analogRead(mq2_2_A);
  int a3 = analogRead(mq2_3_A);

  bool isTempAlarm = (tempC >= FIRE_THRESHOLD);
  bool isGasAlarm  = (d1 == LOW || d2 == LOW || d3 == LOW);

  unsigned long currentMillis = millis();

  // --- DIEU KHIEN LED VA COI ---
  if (isTempAlarm) {
    runChasingEffect(strip.Color(255, 0, 0));
    if (currentMillis - lastBuzzerToggle >= 500) {
      buzzerState = !buzzerState;
      digitalWrite(BUZZER_PIN, buzzerState);
      lastBuzzerToggle = currentMillis;
    }
  } else if (isGasAlarm) {
    if (currentMillis % 500 < 250) {
      for (int i = 0; i < NUM_LEDS; i++) strip.setPixelColor(i, strip.Color(255, 200, 0));
    } else {
      strip.clear();
    }
    strip.show();
    if (currentMillis - lastBuzzerToggle >= 200) {
      buzzerState = !buzzerState;
      digitalWrite(BUZZER_PIN, buzzerState);
      lastBuzzerToggle = currentMillis;
    }
  } else {
    for (int i = 0; i < NUM_LEDS; i++) strip.setPixelColor(i, strip.Color(0, 100, 0));
    strip.show();
    digitalWrite(BUZZER_PIN, LOW);
    buzzerState = false;
  }

  // --- GUI DU LIEU LEN SERVER (moi 3000ms) ---
  if (currentMillis - lastSendTime >= 3000) {
    lastSendTime = currentMillis;
    if (WiFi.status() != WL_CONNECTED) connectWiFi();
    if (tempC != DEVICE_DISCONNECTED_C) {
      postReading(DEVICE_TEMP, "temp", tempC, "C");
    }
    postReading(DEVICE_MQ2_1, "mq2", (float)a1, "raw");
    postReading(DEVICE_MQ2_2, "mq2", (float)a2, "raw");
    postReading(DEVICE_MQ2_3, "mq2", (float)a3, "raw");
  }

  // --- CAP NHAT OLED (moi 500ms) ---
  if (currentMillis - lastUpdate >= 500) {
    lastUpdate = currentMillis;

    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);

    if (isTempAlarm || isGasAlarm) {
      display.setCursor(10, 0);
      display.println(isTempAlarm ? F("!! CANH BAO CHAY !!") : F("!! RO RI GAS !!"));
    } else {
      display.setCursor(30, 0);
      display.println(F("- MONITOR -"));
    }

    display.setCursor(0, 15);
    display.print(F("Temp: "));
    if (tempC != DEVICE_DISCONNECTED_C) {
      display.print(tempC, 1); display.print(F(" C"));
    } else { display.print(F("Error")); }

    display.setCursor(0, 27);
    display.print(F("G1:"));
    display.print(a1);
    display.print(F("  G2:"));
    display.print(a2);

    display.setCursor(0, 38);
    display.print(F("G3:"));
    display.print(a3);

    display.setCursor(0, 52);
    display.print(F("WiFi: "));
    display.print(WiFi.status() == WL_CONNECTED ? "OK" : "OFF");

    display.display();
  }

  delay(30);
}