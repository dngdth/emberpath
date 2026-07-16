#include <Wire.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Adafruit_NeoPixel.h> 
#include <esp_now.h>
#include <WiFi.h>
#include <esp_wifi.h> // Thư viện bắt buộc để cấu hình ép kênh WiFi

// ==================== CẤU HÌNH ĐỊNH DANH NODE ====================
// TRƯỚC KHI NẠP CHO MỖI CON: Bình nhớ đổi NODE_ID thành các số khác nhau (1, 2, 3...)
#define NODE_ID     2   

// ĐIỀN ĐỊA CHỈ MAC CỦA MASTER NODE VÀO ĐÂY (Đã điền đúng MAC Master của bạn)
uint8_t masterMacAddress[] = {0x30, 0x76, 0xF5, 0x94, 0xCF, 0x14}; 

// ==================== CẤU HÌNH NGOẠI VI ====================
#define LED_PIN     12
#define NUM_LEDS    30
#define BRIGHTNESS  150

Adafruit_NeoPixel strip(NUM_LEDS, LED_PIN, NEO_GRB + NEO_KHZ800);

#define ONE_WIRE_BUS 4
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

#define TEMP_MIN 26.0  // Dưới ngưỡng này: LED Xanh lá thuần
#define TEMP_MAX 50.0  // Trên ngưỡng này: LED Đỏ thuần
#define BUZZER_PIN 13

const int mq2_1_A = 32;
const int mq2_1_D = 33;

unsigned long lastBuzzerToggle = 0;
bool buzzerState = false;

// Cấu trúc dữ liệu đồng bộ gửi qua ESP-NOW (Phải khớp 100% với Master)
typedef struct struct_message {
  int id;
  float temp;
  int gasRaw;
  bool emergency;
} struct_message;
struct_message myData;

// ==================== KIỂM TRA TRẠNG THÁI GỬI TIN ====================
void OnDataSent(const esp_now_send_info_t *tx_info, esp_now_send_status_t status) {
  Serial.print(" -> Trạng thái gửi ESP-NOW: ");
  Serial.println(status == ESP_NOW_SEND_SUCCESS ? "THÀNH CÔNG (Đã nhận ACK)" : "THẤT BẠI (Sai MAC hoặc lệch Kênh)");
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

  // Khởi tạo bộ phát WiFi STA vật lý
  WiFi.mode(WIFI_STA);

  // --- ÉP KÊNH WIFI VỀ KÊNH 11 TRÙNG VỚI MASTER ---
  esp_wifi_set_promiscuous(true);
  esp_wifi_set_channel(11, WIFI_SECOND_CHAN_NONE);
  esp_wifi_set_promiscuous(false);

  // Khởi tạo ESP-NOW
  if (esp_now_init() != ESP_OK) {
    Serial.println("Khoi tao ESP-NOW That bai!");
    return;
  }

  // Đăng ký hàm kiểm tra trạng thái gửi
  esp_now_register_send_cb(OnDataSent);
  // Đăng ký kết nối thẳng tới Master Node
  esp_now_peer_info_t peerInfo = {}; // KHẮC PHỤC: Thêm "= {}" để xóa sạch bộ nhớ rác
  memcpy(peerInfo.peer_addr, masterMacAddress, 6);
  peerInfo.channel = 11; // Khai báo kênh kết nối là 11
  peerInfo.encrypt = false;
  peerInfo.ifidx = WIFI_IF_STA;
  
  if (esp_now_add_peer(&peerInfo) != ESP_OK){
    Serial.println("Ket noi voi Master Node that bai!");
    return;
  }
  Serial.println("Khoi dong Node Ve tinh OK, dang san sang gui du lieu...");
}

// ==================== LOOP ====================
void loop() {
  // 1. Đọc dữ liệu từ các cảm biến
  sensors.requestTemperatures();
  float tempC = sensors.getTempCByIndex(0);
  if (tempC == DEVICE_DISCONNECTED_C) tempC = TEMP_MIN; // Tránh lỗi ngắt dây cảm biến

  int d1 = digitalRead(mq2_1_D);
  int a1 = analogRead(mq2_1_A);

  bool isTempAlarm = (tempC >= TEMP_MAX);
  bool isGasAlarm = (d1 == LOW);
  bool isEmergency = (isTempAlarm || isGasAlarm);

  unsigned long currentMillis = millis();

  // 2. Logic điều khiển LED & Còi báo động tại chỗ
  if (isGasAlarm) {
    runGasFlashEffect();
    if (currentMillis - lastBuzzerToggle >= 200) {
      buzzerState = !buzzerState;
      digitalWrite(BUZZER_PIN, buzzerState);
      lastBuzzerToggle = currentMillis;
    }
  } 
  else {
    uint32_t ledColor = getColorFromTemperature(tempC);
    for(int i = 0; i < NUM_LEDS; i++) {
      strip.setPixelColor(i, ledColor);
    }
    strip.show();

    // Nếu nhiệt độ vượt ngưỡng cháy, hú còi nhịp dài
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

  // 3. Đóng gói dữ liệu và bắn về Master Node bằng ESP-NOW
  myData.id = NODE_ID;
  myData.temp = tempC;
  myData.gasRaw = a1;
  myData.emergency = isEmergency;

  esp_now_send(masterMacAddress, (uint8_t *) &myData, sizeof(myData));
  
  // In debug ra Serial Monitor tại chỗ để quan sát nhanh
  Serial.print("Node: "); Serial.print(NODE_ID);
  Serial.print(" | Temp: "); Serial.print(tempC, 1);
  Serial.print(" C | Gas Raw: "); Serial.print(a1);

  delay(50); // Nhịp quét nhanh giúp hiệu ứng LED mượt mà
}