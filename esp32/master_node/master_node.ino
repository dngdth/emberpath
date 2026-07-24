#include <OneWire.h>
#include <DallasTemperature.h>
#include <Adafruit_NeoPixel.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <esp_now.h>
#include <cstring>
#include "GradientField.h"

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

#define TEMP_MIN 26.0  // Dưới ngưỡng này: An toàn
#define TEMP_MAX 50.0  // Trên ngưỡng này: Báo cháy khẩn cấp
#define BUZZER_PIN 13

const int mq2_1_A = 32;
const int mq2_1_D = 33;

unsigned long lastBuzzerToggle = 0;
unsigned long lastSendTime = 0;
bool buzzerState = false;

// ==================== KHAI BÁO BIẾN LƯU TRỮ TOÀN TẦNG ====================
float master_temp = 26.0;
int master_gas = 0;

const int MAX_SATELLITE_ID = 6;
float satelliteTemp[MAX_SATELLITE_ID + 1] = {
  TEMP_MIN, TEMP_MIN, TEMP_MIN, TEMP_MIN, TEMP_MIN, TEMP_MIN, TEMP_MIN
};
int satelliteGas[MAX_SATELLITE_ID + 1] = {};
bool satelliteEmergency[MAX_SATELLITE_ID + 1] = {};
bool satelliteSeen[MAX_SATELLITE_ID + 1] = {};

// Cấu trúc nhận ESP-NOW (Phải khớp chính xác với satellite_node)
typedef struct struct_message {
  int id;
  float temp;
  int gasRaw;
  bool emergency;
} struct_message;
struct_message incomingData;

// ==================== KHỞI TẠO GRADIENT FIELD ROUTER ====================
GradientFieldRouter router;
uint8_t animFrame = 0; // Khai báo biến đếm hiệu ứng chạy LED

void initTopology() {
  // Đăng ký 4 Node cảm biến & 2 Cửa thoát hiểm (Exit A, Exit B)
  router.addNode(0, NODE_NORMAL); // Master Node
  router.addNode(1, NODE_NORMAL); // Satellite Node 1
  router.addNode(2, NODE_NORMAL); // Satellite Node 2
  router.addNode(3, NODE_NORMAL); // Satellite Node 3

  // Node 4-6 vẫn được nhận, báo còi và POST lên backend. Chỉ thêm chúng vào
  // router khi đã khai báo đúng cạnh nối và dải LED vật lý tương ứng.
  
  router.addNode(10, NODE_EXIT);  // Cửa thoát hiểm Exit A
  router.addNode(20, NODE_EXIT);  // Cửa thoát hiểm Exit B

  // Khai báo các đoạn LED tương ứng với các cạnh kết nối (ID, Node A, Node B, StartLedIndex, NumLeds)
  router.addEdge(1, 10, 1, 0, 6);   // Cạnh 1: Exit A (10) <-> Sat 1 (1) (LED 0 -> 5)
  router.addEdge(2, 1, 0, 6, 8);    // Cạnh 2: Sat 1 (1) <-> Master (0) (LED 6 -> 13)
  router.addEdge(3, 0, 2, 14, 8);   // Cạnh 3: Master (0) <-> Sat 2 (2) (LED 14 -> 21)
  router.addEdge(4, 2, 3, 22, 5);   // Cạnh 4: Sat 2 (2) <-> Sat 3 (3) (LED 22 -> 26)
  router.addEdge(5, 3, 20, 27, 3);  // Cạnh 5: Sat 3 (3) <-> Exit B (20) (LED 27 -> 29)
}

// Callback tự động chạy khi nhận được gói tin ESP-NOW từ các vệ tinh
void OnDataRecv(const esp_now_recv_info_t *recv_info, const uint8_t *incomingDataRaw, int len) {
  if (len != sizeof(incomingData)) {
    Serial.print("[ESP-NOW] Bo qua goi sai kich thuoc: ");
    Serial.println(len);
    return;
  }

  memcpy(&incomingData, incomingDataRaw, sizeof(incomingData));

  if (incomingData.id < 1 || incomingData.id > MAX_SATELLITE_ID) {
    Serial.print("[ESP-NOW] Bo qua Node ID khong hop le: ");
    Serial.println(incomingData.id);
    return;
  }

  satelliteTemp[incomingData.id] = incomingData.temp;
  satelliteGas[incomingData.id] = incomingData.gasRaw;
  satelliteEmergency[incomingData.id] = incomingData.emergency;
  satelliteSeen[incomingData.id] = true;
  
  Serial.print("[ESP-NOW] Nhận từ Vệ tinh "); Serial.print(incomingData.id);
  Serial.print(" -> Temp: "); Serial.print(incomingData.temp, 1);
  Serial.print(" C, Gas: "); Serial.print(incomingData.gasRaw);
  Serial.print(" | Emer: "); Serial.println(incomingData.emergency ? "KHẨN CẤP" : "Bình thường");
}

// ==================== KẾT NỐI WIFI ====================
void connectWiFi() {
  Serial.print("Đang kết nối WiFi: ");
  Serial.println(WIFI_SSID);
  
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  unsigned long startAttemptTime = millis();
  
  while (WiFi.status() != WL_CONNECTED && millis() - startAttemptTime < 10000) {
    delay(500);
    Serial.print(".");
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WIFI OK] IP: " + WiFi.localIP().toString());
    Serial.print("==> KÊNH WIFI MASTER: ");
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
  body += "\"unit\":\""         + String(std::strcmp(sensorType, "temp") == 0 ? "C" : "raw") + "\"";
  body += "}";

  int httpCode = http.POST(body);
  Serial.print("[HTTP] ");
  Serial.print(deviceId);
  Serial.print(" -> ");
  Serial.println(httpCode);
  if (httpCode >= 400) {
    Serial.println(http.getString());
  }
  http.end();
}

// ==================== VẼ HIỆU ỨNG LED THEO HƯỚNG GRADIENT ====================
void renderGradientFieldLeds() {
  strip.clear();
  animFrame = (animFrame + 1) % 4; // Tốc độ chạy hạt sáng

  for (int i = 0; i < router.getEdgeCount(); i++) {
    const GradientEdge& edge = router.getEdge(i);
    
    if (edge.direction == DIR_BLOCKED) {
      // Vùng bị cháy/nguy hiểm: Chớp đỏ toàn bộ đoạn LED
      if (millis() % 400 < 200) {
        for (int l = 0; l < edge.numLeds; l++) {
          strip.setPixelColor(edge.startLedIndex + l, strip.Color(255, 0, 0));
        }
      }
    }
    else if (edge.direction == DIR_A_TO_B) {
      // Dòng thoát hiểm đi từ Node A -> Node B (chạy hạt sáng từ đầu -> cuối đoạn)
      for (int l = 0; l < edge.numLeds; l++) {
        if ((l + animFrame) % 3 == 0) {
          strip.setPixelColor(edge.startLedIndex + l, strip.Color(0, 255, 100)); // Hạt xanh lá sáng
        } else {
          strip.setPixelColor(edge.startLedIndex + l, strip.Color(0, 40, 10));  // Nền xanh nhạt
        }
      }
    }
    else if (edge.direction == DIR_B_TO_A) {
      // Dòng thoát hiểm đi từ Node B -> Node A (chạy hạt sáng ngược từ cuối -> đầu đoạn)
      for (int l = 0; l < edge.numLeds; l++) {
        int revL = edge.numLeds - 1 - l;
        if ((revL + animFrame) % 3 == 0) {
          strip.setPixelColor(edge.startLedIndex + l, strip.Color(0, 255, 100)); // Hạt xanh lá sáng
        } else {
          strip.setPixelColor(edge.startLedIndex + l, strip.Color(0, 40, 10));  // Nền xanh nhạt
        }
      }
    }
    else {
      // Không có đường đi / Không dùng: LED sáng mờ tĩnh xanh dương
      for (int l = 0; l < edge.numLeds; l++) {
        strip.setPixelColor(edge.startLedIndex + l, strip.Color(0, 10, 50));
      }
    }
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
  strip.show();

  // Khai báo bản đồ mạng lưới Đồ thị cho Gradient Field
  initTopology();

  connectWiFi();

  WiFi.mode(WIFI_STA); 
  Serial.println("\n=========================================");
  Serial.print("MAC ESP32 MASTER: ");
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
  // 1. Đọc cảm biến tại chỗ của Master Node
  sensors.requestTemperatures();
  master_temp = sensors.getTempCByIndex(0);
  if (master_temp == DEVICE_DISCONNECTED_C) master_temp = TEMP_MIN;

  int d1 = digitalRead(mq2_1_D);
  master_gas = analogRead(mq2_1_A);

  bool master_emergency = (master_temp >= TEMP_MAX || d1 == LOW);

  // 2. Cập nhật Trạng thái Nút cho thuật toán Gradient Field
  router.setNodeStatus(0, master_emergency ? NODE_DANGER : NODE_NORMAL);
  router.setNodeStatus(1, satelliteEmergency[1] ? NODE_DANGER : NODE_NORMAL);
  router.setNodeStatus(2, satelliteEmergency[2] ? NODE_DANGER : NODE_NORMAL);
  router.setNodeStatus(3, satelliteEmergency[3] ? NODE_DANGER : NODE_NORMAL);

  // 3. Thực thi thuật toán Gradient Field C++ trên ESP32
  router.converge();

  // 4. Hiển thị hiệu ứng dải LED dựa trên Hướng chỉ dẫn Gradient Field
  renderGradientFieldLeds();

  // 5. Điều khiển còi hú nếu có bất kỳ node nào bị khẩn cấp
  bool anyEmergency = master_emergency;
  for (int nodeId = 1; nodeId <= MAX_SATELLITE_ID; nodeId++) {
    if (satelliteSeen[nodeId] && satelliteEmergency[nodeId]) {
      anyEmergency = true;
      break;
    }
  }
  unsigned long currentMillis = millis();
  
  if (anyEmergency) {
    if (currentMillis - lastBuzzerToggle >= 200) {
      buzzerState = !buzzerState;
      digitalWrite(BUZZER_PIN, buzzerState);
      lastBuzzerToggle = currentMillis;
    }
  } else {
    digitalWrite(BUZZER_PIN, LOW);
    buzzerState = false;
  }

  // 6. Gửi dữ liệu thu thập được lên Server mỗi 3 giây
  if (currentMillis - lastSendTime >= 3000) {
    lastSendTime = currentMillis;
    
    if (WiFi.status() != WL_CONNECTED) {
      WiFi.disconnect();
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    }
    
    if (WiFi.status() == WL_CONNECTED) {
      postReading("temp-master", "temp", master_temp);
      postReading("mq2-master",  "mq2",  (float)master_gas);
      for (int nodeId = 1; nodeId <= MAX_SATELLITE_ID; nodeId++) {
        if (!satelliteSeen[nodeId]) continue;

        char tempDeviceId[20];
        char mq2DeviceId[20];
        snprintf(tempDeviceId, sizeof(tempDeviceId), "temp-sat-%d", nodeId);
        snprintf(mq2DeviceId, sizeof(mq2DeviceId), "mq2-sat-%d", nodeId);
        postReading(tempDeviceId, "temp", satelliteTemp[nodeId]);
        postReading(mq2DeviceId, "mq2", (float)satelliteGas[nodeId]);
      }
    }
  }

  delay(60); // Nhịp quét hiệu ứng chỉ hướng mượt mà
}
