#include <OneWire.h>
#include <DallasTemperature.h>
#include <Adafruit_NeoPixel.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <esp_now.h>

// ==================== CẤU HÌNH LED ====================
#define LED_PIN     12
#define NUM_LEDS    30
#define BRIGHTNESS  150
Adafruit_NeoPixel strip(NUM_LEDS, LED_PIN, NEO_GRB + NEO_KHZ800);

// ==================== CẤU HÌNH WIFI & SERVER ====================
const char* WIFI_SSID     = "shin-laptop";
const char* WIFI_PASSWORD = "binh2004";
const char* SERVER_URL    = "http://10.42.0.1:8000/device-readings/ingest";

#define ONE_WIRE_BUS 4
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

#define TEMP_MIN 26.0  // Dưới ngưỡng này: LED Xanh lá thuần
#define TEMP_MAX 50.0  // Trên ngưỡng này: LED Đỏ thuần
#define BUZZER_PIN 13

const int mq2_1_A = 32;
const int mq2_1_D = 33;

unsigned long lastBuzzerToggle = 0;
unsigned long lastSendTime = 0;
bool buzzerState = false;

// ==================== KHAI BÁO BIẾN LƯU TRỮ TOÀN TẦNG ====================
// Dữ liệu đo được tại chỗ của chính Master Node
float master_temp = 26.0;
int master_gas = 0;

// Dữ liệu gom từ các Satellite Node thông qua mạng ESP-NOW (Tối đa 3 vệ tinh)
float s1_temp = 26.0, s2_temp = 26.0, s3_temp = 26.0;
int s1_gas = 0, s2_gas = 0, s3_gas = 0;
bool s1_emergency = false, s2_emergency = false, s3_emergency = false;

// Cấu trúc nhận ESP-NOW (Phải khớp chính xác với satellite_node)
typedef struct struct_message {
  int id;
  float temp;
  int gasRaw;
  bool emergency;
} struct_message;
struct_message incomingData;

// Hàm callback tự động chạy khi nhận được gói tin ESP-NOW từ các vệ tinh
// Hàm callback tự động chạy khi nhận được gói tin ESP-NOW từ các vệ tinh
void OnDataRecv(const esp_now_recv_info_t *recv_info, const uint8_t *incomingDataRaw, int len) {
  memcpy(&incomingData, incomingDataRaw, sizeof(incomingData));
  
  // Ở bản Core 3.x, nếu Bình muốn lấy địa chỉ MAC của con gửi thì dùng:
  // const uint8_t* mac = recv_info->src_addr;

  // Phân loại dữ liệu dựa trên ID của Satellite Node gửi về
  if (incomingData.id == 1) {
    s1_temp = incomingData.temp;
    s1_gas = incomingData.gasRaw;
    s1_emergency = incomingData.emergency;
  }
  else if (incomingData.id == 2) {
    s2_temp = incomingData.temp;
    s2_gas = incomingData.gasRaw;
    s2_emergency = incomingData.emergency;
  }
  else if (incomingData.id == 3) {
    s3_temp = incomingData.temp;
    s3_gas = incomingData.gasRaw;
    s3_emergency = incomingData.emergency;
  }
  
  // In nhanh ra Serial để debug dữ liệu nhận được từ ngách
  Serial.print("[ESP-NOW] Nhận từ Vệ tinh "); Serial.print(incomingData.id);
  Serial.print(" -> Temp: "); Serial.print(incomingData.temp, 1);
  Serial.print(" C, Gas: "); Serial.println(incomingData.gasRaw);
}

// ==================== KẾT NỐI WIFI ====================
void connectWiFi() {
  Serial.print("Đang kết nối WiFi: ");
  Serial.println(WIFI_SSID);
  
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  unsigned long startAttemptTime = millis();
  
  // Giới hạn thời gian kết nối tối đa 10 giây để tránh nghẽn luồng đọc cảm biến
  while (WiFi.status() != WL_CONNECTED && millis() - startAttemptTime < 10000) {
    delay(500);
    Serial.print(".");
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WIFI OK] IP: " + WiFi.localIP().toString());
    Serial.print("==> KÊNH WIFI MASTER ĐANG CHẠY LÀ: ");
    Serial.println(WiFi.channel());
  } else {
    Serial.println("\n[WIFI FAIL] Không kết nối được WiFi. Chạy chế độ ngoại tuyến...");
  }
}

// ==================== GỬI HTTP POST LÊN SERVER ====================
void postReading(const char* deviceId, const char* sensorType, float value) {
  if (WiFi.status() != WL_CONNECTED) return;
  
  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");

  String body = "{";
  body += "\"buildingCode\":\"B01\",";
  body += "\"deviceId\":\""     + String(deviceId)      + "\",";
  body += "\"sensorType\":\""   + String(sensorType)    + "\",";
  body += "\"value\":"          + String(value, 2)      + ",";
  body += "\"unit\":\""         + String(sensorType == "temp" ? "C" : "raw") + "\"";
  body += "}";

  int httpCode = http.POST(body);
  http.end();

  if (httpCode == 200) {
    Serial.println("[Web OK] " + String(deviceId) + " = " + String(value));
  } else {
    Serial.println("[Web FAIL] " + String(deviceId) + " code=" + httpCode);
  }
}

// ==================== HÀM NỘI SUY MÀU LED THEO NHIỆT ĐỘ ====================
uint32_t getColorFromTemperature(float temp) {
  if (temp < TEMP_MIN) temp = TEMP_MIN;
  if (temp > TEMP_MAX) temp = TEMP_MAX;

  float fraction = (temp - TEMP_MIN) / (TEMP_MAX - TEMP_MIN);
  int r = 0, g = 0, b = 0;
  
  if (fraction <= 0.5) {
    r = (int)(fraction * 2.0 * 255);
    g = 255;
  } else {
    r = 255;
    g = (int)((1.0 - fraction) * 2.0 * 255);
  }
  return strip.Color(r, g, b);
}

// ==================== HIỆU ỨNG CHỚP KHẨN CẤP KHI CÓ GAS/KHÓI ====================
void runGasFlashEffect() {
  if (millis() % 400 < 200) {
    for(int i=0; i<NUM_LEDS; i++) strip.setPixelColor(i, strip.Color(255, 160, 0));
  } else {
    strip.clear();
  }
  strip.show();
}

// ==================== SETUP ====================
void setup() {
  Serial.begin(115200);
  pinMode(mq2_1_D, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  sensors.begin();
  strip.begin();
  strip.setBrightness(BRIGHTNESS);
  strip.show(); // Tắt hết LED lúc khởi động

  // Kết nối WiFi lúc khởi động
  connectWiFi();

  // Khởi động ESP-NOW song song với chế độ kết nối mạng WiFi
  WiFi.mode(WIFI_STA); 
  Serial.println("\n=========================================");
  Serial.print("DIA CHI MAC CUA CON ESP32 NAY LA: ");
  Serial.println(WiFi.macAddress());
  Serial.println("=========================================");
  if (esp_now_init() == ESP_OK) {
    Serial.println("[ESP-NOW OK] Đang chờ nhận dữ liệu từ các vệ tinh...");
    esp_now_register_recv_cb(OnDataRecv);  
    } else {
    Serial.println("[ESP-NOW FAIL] Lỗi khởi tạo nhận dữ liệu!");
  }
}

// ==================== LOOP ====================
void loop() {
  // 1. Đọc cảm biến tại chỗ của chính Master Node
  sensors.requestTemperatures();
  master_temp = sensors.getTempCByIndex(0);
  if (master_temp == DEVICE_DISCONNECTED_C) master_temp = TEMP_MIN; // Tránh lỗi lỏng dây cảm biến

  int d1 = digitalRead(mq2_1_D);
  master_gas = analogRead(mq2_1_A);

  bool isTempAlarm = (master_temp >= TEMP_MAX);
  bool isGasAlarm  = (d1 == LOW);
  unsigned long currentMillis = millis();

  // 2. Logic điều khiển LED & Còi tại chỗ của Master
  if (isGasAlarm) {
    runGasFlashEffect();
    if (currentMillis - lastBuzzerToggle >= 200) {
      buzzerState = !buzzerState;
      digitalWrite(BUZZER_PIN, buzzerState);
      lastBuzzerToggle = currentMillis;
    }
  } 
  else {
    uint32_t ledColor = getColorFromTemperature(master_temp);
    for(int i = 0; i < NUM_LEDS; i++) {
      strip.setPixelColor(i, ledColor);
    }
    strip.show();

    if (isTempAlarm) {
      if (currentMillis - lastBuzzerToggle >= 500) {
        buzzerState = !buzzerState;
        digitalWrite(BUZZER_PIN, buzzerState);
        lastBuzzerToggle = currentMillis;
      }
    } else {
      digitalWrite(BUZZER_PIN, LOW);
      buzzerState = false;
    }
  }

  // 3. GỬI DỮ LIỆU TOÀN BỘ CÁC NODE LÊN SERVER (Mỗi 3 giây)
  if (currentMillis - lastSendTime >= 3000) {
    lastSendTime = currentMillis;
    
    // Tự kết nối lại nếu bị rớt WiFi giữa chừng
    if (WiFi.status() != WL_CONNECTED) {
      WiFi.disconnect();
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    }
    
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("\n--- Đang đẩy dữ liệu toàn hệ thống lên Web Dashboard ---");
      // Đẩy dữ liệu tại chỗ của Master Node
      postReading("temp-master", "temp", master_temp);
      postReading("mq2-master", "mq2", (float)master_gas);

      // Đẩy dữ liệu thu được từ Satellite Node 1
      postReading("temp-sat-1", "temp", s1_temp);
      postReading("mq2-sat-1", "mq2", (float)s1_gas);

      // Đẩy dữ liệu thu được từ Satellite Node 2
      postReading("temp-sat-2", "temp", s2_temp);
      postReading("mq2-sat-2", "mq2", (float)s2_gas);

      // Đẩy dữ liệu thu được từ Satellite Node 3
      postReading("temp-sat-3", "temp", s3_temp);
      postReading("mq2-sat-3", "mq2", (float)s3_gas);
    } else {
      Serial.println("\n[Cảnh báo] Mất kết nối WiFi, không thể gửi dữ liệu lên Web!");
    }
  }

  delay(30); // Giữ nhịp độ mượt cho dải LED
}