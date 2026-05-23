#include <SPI.h>
#include <LoRa.h>

#define SCK     18
#define MISO    19
#define MOSI    23
#define SS      5
#define RST     14
#define DIO0    2

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n--- ESP32 LORA ANALOG RECEIVER ---");

  SPI.begin(SCK, MISO, MOSI, SS);
  LoRa.setPins(SS, RST, DIO0);

  if (!LoRa.begin(433E6)) {
    Serial.println("Khoi tao LoRa THAT BAI!");
    while (1);
  }
  
  LoRa.setSignalBandwidth(125E3);
  LoRa.setSpreadingFactor(7);
  LoRa.setSyncWord(0xF3);

  Serial.println("Khoi tao LoRa THANH CONG! Dang doi du lieu...");
  Serial.println("==================================================");
}

void loop() {
  int packetSize = LoRa.parsePacket();
  
  if (packetSize) {
    String receivedData = "";
    while (LoRa.available()) {
      receivedData += (char)LoRa.read();
    }

    // Chỉ lọc gói tin chuẩn bắt đầu bằng "T:"
    if (receivedData.startsWith("T:")) {
      int pipe1 = receivedData.indexOf('|');
      int pipe2 = receivedData.indexOf('|', pipe1 + 1);

      if (pipe1 != -1 && pipe2 != -1) {
        // 1. Trích xuất nhiệt độ
        String temp = receivedData.substring(2, pipe1);
        
        // 2. Trích xuất vùng chuỗi chứa 3 cảm biến Gas (Ví dụ: "1250,850,3100")
        String gasSection = receivedData.substring(pipe1 + 3, pipe2);
        
        // Tiến hành bóc tách nhỏ lẻ theo từng dấu phẩy
        int comma1 = gasSection.indexOf(',');
        int comma2 = gasSection.indexOf(',', comma1 + 1);
        
        String valGas1 = gasSection.substring(0, comma1);
        String valGas2 = gasSection.substring(comma1 + 1, comma2);
        String valGas3 = gasSection.substring(comma2 + 1);
        
        // 3. Trích xuất trạng thái báo động
        String alarm = receivedData.substring(pipe2 + 3);

        // Hiển thị giao diện dữ liệu Analog chi tiết lên Serial Monitor
        Serial.print("[Gói tin gốc]: "); Serial.println(receivedData);
        Serial.print("[Độ mạnh sóng RSSI]: "); Serial.print(LoRa.packetRssi()); Serial.println(" dBm");
        Serial.println("----------- THÔNG TIN GIÁM SÁT CHI TIẾT -----------");
        Serial.print("  Nhiệt độ đo được: "); Serial.print(temp); Serial.println(" C");
        
        Serial.println("  Nồng độ khí khói cảm biến MQ2 (0 - 4095):");
        Serial.print("    + Cảm biến 1: "); Serial.println(valGas1);
        Serial.print("    + Cảm biến 2: "); Serial.println(valGas2);
        Serial.print("    + Cảm biến 3: "); Serial.println(valGas3);

        Serial.print("  TRẠNG THÁI TỔNG: ");
        if (alarm == "1") {
          Serial.println("⚠️ !!! CẢNH BÁO: PHÁT HIỆN SỰ CỐ NGUY HIỂM !!!");
        } else {
          Serial.println("✅ Hệ thống an toàn");
        }
        Serial.println("==================================================\n");
      }
    }
  }
}