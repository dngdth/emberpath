#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Adafruit_NeoPixel.h> 
#include <SPI.h>
#include <LoRa.h>

// --- CẤU HÌNH OLED & LED ---
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1
#define SCREEN_ADDRESS 0x3C 

#define LED_PIN     12
#define NUM_LEDS    30 
#define BRIGHTNESS  150 

// --- CẤU HÌNH LORA RA-02 ---
#define SCK     18
#define MISO    19
#define MOSI    23
#define SS      5
#define RST     14
#define DIO0    2
#define LED_STATUS 25 

Adafruit_NeoPixel strip(NUM_LEDS, LED_PIN, NEO_GRB + NEO_KHZ800);
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

#define ONE_WIRE_BUS 4 
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// --- NGƯỠNG NHIỆT ĐỘ CẤU HÌNH MÀU LED ---
#define TEMP_MIN 26.0  // Dưới ngưỡng này: LED Xanh lá thuần (0, 255, 0)
#define TEMP_MAX 50.0  // Trên ngưỡng này: LED Đỏ thuần (255, 0, 0)

#define BUZZER_PIN 13

const int mq2_1_A = 32; const int mq2_1_D = 33;
const int mq2_2_A = 34; const int mq2_2_D = 26;
const int mq2_3_A = 35; const int mq2_3_D = 16;

unsigned long lastBuzzerToggle = 0;
unsigned long lastUpdate = 0;
unsigned long lastLoraSend = 0; 
bool buzzerState = false;

void setup() {
  Serial.begin(115200);
  pinMode(mq2_1_D, INPUT); pinMode(mq2_2_D, INPUT); pinMode(mq2_3_D, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  pinMode(LED_STATUS, OUTPUT);

  sensors.begin();
  if(!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) for(;;);

  SPI.begin(SCK, MISO, MOSI, SS);
  LoRa.setPins(SS, RST, DIO0);
  if (!LoRa.begin(433E6)) while(1);

  LoRa.setSignalBandwidth(125E3);
  LoRa.setSpreadingFactor(7);
  LoRa.setSyncWord(0xF3);

  strip.begin();
  strip.setBrightness(BRIGHTNESS);
  strip.show(); 
}

// Hàm tính toán pha trộn màu mượt mà từ Xanh -> Vàng -> Đỏ theo nhiệt độ
uint32_t getColorFromTemperature(float temp) {
  // Giới hạn nhiệt độ trong khoảng MIN và MAX
  if (temp < TEMP_MIN) temp = TEMP_MIN;
  if (temp > TEMP_MAX) temp = TEMP_MAX;

  // Tính toán tỷ lệ phần trăm (từ 0.0 đến 1.0) của nhiệt độ hiện tại trong khoảng thiết lập
  float fraction = (temp - TEMP_MIN) / (TEMP_MAX - TEMP_MIN);

  int r = 0, g = 0, b = 0;

  // Giai đoạn 1: Từ Xanh lá chuyển dần sang Vàng (fraction từ 0.0 đến 0.5)
  if (fraction <= 0.5) {
    r = (int)(fraction * 2.0 * 255); // Màu Đỏ tăng dần lên
    g = 255;                         // Màu Xanh lá giữ tối đa
  } 
  // Giai đoạn 2: Từ Vàng chuyển dần sang Đỏ (fraction từ 0.5 đến 1.0)
  else {
    r = 255;                         // Màu Đỏ giữ tối đa
    g = (int)((1.0 - fraction) * 2.0 * 255); // Màu Xanh lá giảm dần xuống
  }

  return strip.Color(r, g, b);
}

// Hiệu ứng nhấp nháy khẩn cấp màu Vàng (Dành riêng cho lỗi Gas)
void runGasFlashEffect() {
  if (millis() % 400 < 200) {
    for(int i=0; i<NUM_LEDS; i++) strip.setPixelColor(i, strip.Color(255, 160, 0));
  } else {
    strip.clear();
  }
  strip.show();
}

void loop() {
  sensors.requestTemperatures();
  float tempC = sensors.getTempCByIndex(0);
  if (tempC == DEVICE_DISCONNECTED_C) tempC = TEMP_MIN; // Chống lỗi ngắt dây cảm biến

  int d1 = digitalRead(mq2_1_D);
  int d2 = digitalRead(mq2_2_D);
  int d3 = digitalRead(mq2_3_D);
  int a1 = analogRead(mq2_1_A); int a2 = analogRead(mq2_2_A); int a3 = analogRead(mq2_3_A);

  bool isTempAlarm = (tempC >= TEMP_MAX);
  bool isGasAlarm = (d1 == LOW || d2 == LOW || d3 == LOW);
  bool isEmergency = (isTempAlarm || isGasAlarm);

  unsigned long currentMillis = millis();

  // --- QUẢN LÝ MÀU SẮC LED THEO ĐIỀU KIỆN ---
  if (isGasAlarm) {
    // Ưu tiên hiển thị chớp Vàng độc lập nếu dính rò rỉ khí Gas/Khói
    runGasFlashEffect();
    if (currentMillis - lastBuzzerToggle >= 200) {
      buzzerState = !buzzerState;
      digitalWrite(BUZZER_PIN, buzzerState);
      lastBuzzerToggle = currentMillis;
    }
  } 
  else {
    // Trạng thái bình thường hoặc cháy nhiệt độ: LED chuyển màu mượt mà từ Xanh -> Đỏ
    uint32_t ledColor = getColorFromTemperature(tempC);
    for(int i = 0; i < NUM_LEDS; i++) {
      strip.setPixelColor(i, ledColor);
    }
    strip.show();

    // Nếu nhiệt độ vượt ngưỡng cháy, rú còi nhịp dài
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

  // --- TRUYỀN DỮ LIỆU QUA LORA ---
  unsigned long loraInterval = isEmergency ? 500 : 4000;
  if (currentMillis - lastLoraSend >= loraInterval) {
    digitalWrite(LED_STATUS, LOW);
    LoRa.beginPacket();
    LoRa.print("T:");    LoRa.print(tempC, 1);
    LoRa.print("|G:");   LoRa.print(a1); LoRa.print(","); LoRa.print(a2); LoRa.print(","); LoRa.print(a3);
    LoRa.print("|A:");   LoRa.print(isEmergency ? "1" : "0");
    LoRa.endPacket();
    digitalWrite(LED_STATUS, HIGH);
    lastLoraSend = currentMillis;
  }

  // --- CẬP NHẬT OLED ---
  if (currentMillis - lastUpdate >= 500) {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    
    if (isEmergency) {
      display.setCursor(10, 0);
      display.println(isTempAlarm ? F("!! CANH BAO CHAY !!") : F("!! RO RI GAS !!"));
    } else {
      display.setCursor(30, 0);
      display.println(F("- MONITOR -"));
    }

    display.setCursor(0, 15);
    display.print(F("Temp: ")); display.print(tempC, 1); display.print(F(" C"));
    display.setCursor(0, 35);
    display.print(F("G1:")); display.print(a1); display.print(F(" G2:")); display.print(a2);
    display.setCursor(0, 50);
    display.print(F("G3:")); display.print(a3);
    display.display();
    lastUpdate = currentMillis;
  }
  delay(30);
}