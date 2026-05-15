import asyncio
from datetime import datetime
import websockets


async def handle_client(websocket, path=None):
    print("ESP32 đã kết nối:", websocket.remote_address)

    try:
        async for message in websocket:
            now = datetime.now().strftime("%H:%M:%S")

            print("\n==============================")
            print(f"Thời gian: {now}")
            print("Dữ liệu ESP32 gửi lên:")
            print(message)
            print("==============================")

            await websocket.send("PC_ACK: Đã nhận dữ liệu")

    except websockets.exceptions.ConnectionClosed:
        print("ESP32 đã ngắt kết nối")


async def main():
    print("WebSocket Server đang chạy tại:")
    print("ws://0.0.0.0:3030")
    print("ESP32 sẽ kết nối tới: ws://192.168.137.1:3030")
    print("Đang chờ ESP32...\n")

    async with websockets.serve(handle_client, "0.0.0.0", 3030):
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())