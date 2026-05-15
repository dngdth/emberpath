#include <WiFi.h>
#include <ArduinoWebsockets.h>

using namespace websockets;

WebsocketsClient socket;

const char* ssid = "SHIN_LAPTOP";
const char* password = "binh2004";

const char* websocketServer = "ws://192.168.137.1:3030";

unsigned long lastSendTime = 0;
int counter = 0;

void handleMessage(WebsocketsMessage message) {
  Serial.println("Server phản hồi: " + message.data());
}

void handleEvent(WebsocketsEvent event, WSInterfaceString data) {
  if (event == WebsocketsEvent::ConnectionOpened) {
    Serial.println("Đã kết nối WebSocket thành công!");
  } else if (event == WebsocketsEvent::ConnectionClosed) {
    Serial.println("Mất kết nối WebSocket!");
  }
}

void connectWiFi() {
  Serial.println();
  Serial.println("Đang kết nối WiFi...");

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("WiFi đã kết nối!");
  Serial.print("IP của ESP32: ");
  Serial.println(WiFi.localIP());
}

void connectWebSocket() {
  Serial.println("Đang kết nối WebSocket...");

  while (!socket.connect(websocketServer)) {
    Serial.println("Kết nối WebSocket thất bại, thử lại sau 2 giây...");
    delay(2000);
  }

  Serial.println("Đã kết nối tới WebSocket Server!");
}

void sendMockSensorData() {
  counter++;

  float mq2Value = 120.0 + (counter % 20) * 5.5;
  float temperatureValue = 28.0 + (counter % 10) * 0.4;

  String payload = "{";
  payload += "\"deviceId\":\"esp32-test-01\",";
  payload += "\"mq2\":";
  payload += String(mq2Value, 2);
  payload += ",";
  payload += "\"temperature\":";
  payload += String(temperatureValue, 2);
  payload += ",";
  payload += "\"unitMq2\":\"ppm\",";
  payload += "\"unitTemperature\":\"C\",";
  payload += "\"counter\":";
  payload += String(counter);
  payload += "}";

  bool sent = socket.send(payload);

  if (sent) {
    Serial.println("Đã gửi dữ liệu lên PC:");
    Serial.println(payload);
  } else {
    Serial.println("Gửi dữ liệu thất bại!");
  }
}

void setup() {
  Serial.begin(115200);

  socket.onMessage(handleMessage);
  socket.onEvent(handleEvent);

  connectWiFi();
  connectWebSocket();
}

void loop() {
  socket.poll();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi bị mất, đang kết nối lại...");
    connectWiFi();
  }

  if (!socket.available()) {
    Serial.println("WebSocket bị mất, đang kết nối lại...");
    connectWebSocket();
  }

  if (millis() - lastSendTime >= 2000) {
    lastSendTime = millis();
    sendMockSensorData();
  }
}