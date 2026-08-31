# ESP32 Fingerprint HTTP Server

This folder contains an ESP32 sketch that exposes fingerprint REST APIs over Wi-Fi:

- `POST /enroll`
- `GET /verify`
- `GET /users`
- `DELETE /delete/{id}`

Default static IP in the sketch: `192.168.1.50`

## Wiring / Pin Diagram (Short)

### ESP32 ↔ Fingerprint Sensor (UART)

- Sensor `VCC` → ESP32 `5V` (or module-rated supply)
- Sensor `GND` → ESP32 `GND`
- Sensor `TX` → ESP32 `GPIO16` (UART2 RX)
- Sensor `RX` → ESP32 `GPIO17` (UART2 TX)

Configured in code:

- `HardwareSerial(2)` at `57600`
- RX pin `16`, TX pin `17`

### ESP32 ↔ 16x2 I2C LCD

- LCD `VCC` → ESP32 `5V`
- LCD `GND` → ESP32 `GND`
- LCD `SDA` → ESP32 `GPIO21`
- LCD `SCL` → ESP32 `GPIO22`

Configured in code:

- I2C LCD address `0x27`
- Size `16x2`

## Arduino IDE Board Settings

Use these recommended settings:

- **Board**: `ESP32 Dev Module`
- **Port**: your ESP32 COM port
- **Upload Speed**: `921600` (or `115200` if unstable)
- **CPU Frequency**: `240MHz (WiFi/BT)`
- **Flash Frequency**: `80MHz`
- **Flash Mode**: `QIO`
- **Flash Size**: `4MB (32Mb)`
- **Partition Scheme**: `Default 4MB with spiffs`
- **PSRAM**: `Disabled` (unless your board has PSRAM and you need it)

## Required Libraries

Install via Library Manager:

- `ArduinoJson`
- `Adafruit Fingerprint Sensor Library`
- `LiquidCrystal_I2C`

## Before Upload

1. Open `fingerprint_http_server.ino`.
2. Set your Wi-Fi values:
   - `WIFI_SSID`
   - `WIFI_PASSWORD`
3. Confirm static IP values match your network:
   - `localIP`, `gateway`, `subnet`, `dns`
4. Ensure phone and ESP32 are on the same Wi-Fi.

## Quick API Test (Optional)

From a terminal (replace IP if changed):

- Enroll:
  - `curl -X POST http://192.168.1.50/enroll -H "Content-Type: application/json" -d "{\"id\":1}"`
- Verify:
  - `curl http://192.168.1.50/verify`
- Users:
  - `curl http://192.168.1.50/users`
- Delete:
  - `curl -X DELETE http://192.168.1.50/delete/1`
