#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Adafruit_NeoPixel.h> 

// --- CẤU HÌNH ---
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1
#define SCREEN_ADDRESS 0x3C 

#define LED_PIN     12
#define NUM_LEDS    30 
#define BRIGHTNESS  150 

// Khởi tạo NeoPixel cho WS2813
Adafruit_NeoPixel strip(NUM_LEDS, LED_PIN, NEO_GRB + NEO_KHZ800);
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

#define ONE_WIRE_BUS 4 
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);
#define FIRE_THRESHOLD 50.0 

#define BUZZER_PIN 13

const int mq2_1_A = 27; const int mq2_1_D = 33;
const int mq2_2_A = 34; const int mq2_2_D = 32;
const int mq2_3_A = 35; const int mq2_3_D = 16;

unsigned long lastBuzzerToggle = 0;
unsigned long lastUpdate = 0;
bool buzzerState = false;

void setup() {
  Serial.begin(115200);
  pinMode(mq2_1_D, INPUT); pinMode(mq2_2_D, INPUT); pinMode(mq2_3_D, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  sensors.begin();
  if(!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) for(;;);

  strip.begin();
  strip.setBrightness(BRIGHTNESS);
  strip.show(); // Tắt hết LED lúc đầu

  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(15, 25);
  display.println(F("SMART FIRE ALARM"));
  display.display();
  delay(2000);
}

// Hiệu ứng chạy đuổi (Chasing Effect)
void runChasingEffect(uint32_t color) {
  static int pos = 0;
  strip.clear();
  for(int i=0; i<3; i++) {
    strip.setPixelColor((pos + i) % NUM_LEDS, color);
  }
  strip.show();
  pos = (pos + 1) % NUM_LEDS;
}

void loop() {
  sensors.requestTemperatures();
  float tempC = sensors.getTempCByIndex(0);

  int d1 = digitalRead(mq2_1_D);
  int d2 = digitalRead(mq2_2_D);
  int d3 = digitalRead(mq2_3_D);

  bool isTempAlarm = (tempC >= FIRE_THRESHOLD);
  bool isGasAlarm = (d1 == LOW || d2 == LOW || d3 == LOW);

  unsigned long currentMillis = millis();

  // ĐIỀU KHIỂN LED VÀ CÒI
  if (isTempAlarm) {
    runChasingEffect(strip.Color(255, 0, 0)); // Màu Đỏ chạy đuổi
    if (currentMillis - lastBuzzerToggle >= 500) {
      buzzerState = !buzzerState;
      digitalWrite(BUZZER_PIN, buzzerState);
      lastBuzzerToggle = currentMillis;
    }
  } 
  else if (isGasAlarm) {
    // Hiệu ứng chớp nháy màu Vàng cho Gas
    if (currentMillis % 500 < 250) {
      for(int i=0; i<NUM_LEDS; i++) strip.setPixelColor(i, strip.Color(255, 200, 0));
    } else {
      strip.clear();
    }
    strip.show();

    if (currentMillis - lastBuzzerToggle >= 200) {
      buzzerState = !buzzerState;
      digitalWrite(BUZZER_PIN, buzzerState);
      lastBuzzerToggle = currentMillis;
    }
  } 
  else {
    // Trạng thái an toàn: 
    for(int i=0; i<NUM_LEDS; i++) strip.setPixelColor(i, strip.Color(0, 100, 0));
    strip.show();
    digitalWrite(BUZZER_PIN, LOW);
    buzzerState = false;
  }

  // CẬP NHẬT OLED (Giảm tần suất cập nhật để LED không bị giật)
  if (currentMillis - lastUpdate >= 500) {
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
    if(tempC != DEVICE_DISCONNECTED_C) {
      display.print(tempC, 1); display.print(F(" C"));
    } else { display.print(F("Error")); }

    display.setCursor(0, 35);
    display.print(F("Sensors: "));
    display.print(d1==LOW ? "!" : "ok"); display.print(" ");
    display.print(d2==LOW ? "!" : "ok"); display.print(" ");
    display.print(d3==LOW ? "!" : "ok");

    display.display();
    lastUpdate = currentMillis;
  }

  delay(30); // Tốc độ hiệu ứng LED
}