#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <Adafruit_Fingerprint.h>
#include <LiquidCrystal_I2C.h>
#include <ctype.h>

// ==============================
// Wi-Fi + Static IP Configuration
// ==============================
const char* WIFI_SSID = "GlobeAtHome_805A4";
const char* WIFI_PASSWORD = "3FEB58C1";

IPAddress localIP(192, 168, 1, 50);
IPAddress gateway(192, 168, 1, 1);
IPAddress subnet(255, 255, 255, 0);
IPAddress dns(8, 8, 8, 8);
const bool USE_STATIC_IP = false;

// ==============================
// LCD (16x2 I2C)
// ==============================
LiquidCrystal_I2C lcd(0x27, 16, 2);

// ==============================
// Fingerprint Sensor (UART)
// ESP32 Serial2 pins: RX=16, TX=17 (change if needed)
// Sensor TX -> ESP32 RX(16)
// Sensor RX -> ESP32 TX(17)
// ==============================
HardwareSerial FingerSerial(2);
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&FingerSerial);

// ==============================
// HTTP Server
// ==============================
WebServer server(80);
const uint16_t MIN_FINGERPRINT_ID = 0;
const uint16_t MAX_FINGERPRINT_ID = 1000;
bool knownIds[MAX_FINGERPRINT_ID + 1] = { false };
bool idCacheReady = false;

bool isAllDigits(const String& value) {
  if (value.length() == 0) {
    return false;
  }

  for (size_t i = 0; i < value.length(); i++) {
    if (!isdigit(value[i])) {
      return false;
    }
  }

  return true;
}

void clearIdCache() {
  for (uint16_t id = MIN_FINGERPRINT_ID; id <= MAX_FINGERPRINT_ID; id++) {
    knownIds[id] = false;
  }
}

void buildIdCache() {
  clearIdCache();
  for (uint16_t id = MIN_FINGERPRINT_ID; id <= MAX_FINGERPRINT_ID; id++) {
    uint8_t p = finger.loadModel(id);
    knownIds[id] = (p == FINGERPRINT_OK);
    delay(5);
  }
  idCacheReady = true;
}

void lcdShow(const String& line1, const String& line2 = "") {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(line1.substring(0, 16));
  lcd.setCursor(0, 1);
  lcd.print(line2.substring(0, 16));
}

void sendJson(int statusCode, const String& payload) {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  server.sendHeader("Content-Type", "application/json");
  server.send(statusCode, "application/json", payload);
}

void handleOptions() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  server.send(204);
}

String jsonError(const String& message) {
  StaticJsonDocument<128> doc;
  doc["status"] = "error";
  doc["message"] = message;
  String out;
  serializeJson(doc, out);
  return out;
}

// Capture and convert image to char buffer slot 1 or 2
bool captureAndConvert(uint8_t slot) {
  uint8_t p = FINGERPRINT_NOFINGER;
  unsigned long start = millis();

  while (p != FINGERPRINT_OK) {
    p = finger.getImage();

    if (p == FINGERPRINT_OK) {
      break;
    }

    if (p != FINGERPRINT_NOFINGER && p != FINGERPRINT_PACKETRECIEVEERR) {
      return false;
    }

    if (millis() - start > 15000) {
      return false;
    }

    delay(50);
  }

  p = finger.image2Tz(slot);
  return p == FINGERPRINT_OK;
}

bool enrollFingerprintById(uint16_t id, String& message) {
  if (id < MIN_FINGERPRINT_ID || id > MAX_FINGERPRINT_ID) {
    message = "ID must be 0-1000";
    return false;
  }

  lcdShow("Place Finger", "Enroll ID " + String(id));

  if (!captureAndConvert(1)) {
    message = "Failed first scan";
    return false;
  }

  lcdShow("Remove Finger", "Then place again");
  delay(2000);

  while (finger.getImage() != FINGERPRINT_NOFINGER) {
    delay(50);
  }

  lcdShow("Place Finger", "Again ID " + String(id));
  if (!captureAndConvert(2)) {
    message = "Failed second scan";
    return false;
  }

  uint8_t p = finger.createModel();
  if (p != FINGERPRINT_OK) {
    message = "Failed to create model";
    return false;
  }

  p = finger.storeModel(id);
  if (p != FINGERPRINT_OK) {
    message = "Failed to store model";
    return false;
  }

  message = "Enrollment complete";
  return true;
}

bool verifyFingerprintNow(uint16_t& matchedId, String& message) {
  lcdShow("Scan Finger", "Verifying...");

  uint8_t p = FINGERPRINT_NOFINGER;
  unsigned long start = millis();

  while (p != FINGERPRINT_OK) {
    p = finger.getImage();

    if (p == FINGERPRINT_OK) {
      break;
    }

    if (p != FINGERPRINT_NOFINGER && p != FINGERPRINT_PACKETRECIEVEERR) {
      message = "Fingerprint not recognized";
      return false;
    }

    if (millis() - start > 10000) {
      message = "Fingerprint not recognized";
      return false;
    }

    delay(50);
  }

  p = finger.image2Tz();
  if (p != FINGERPRINT_OK) {
    message = "Fingerprint not recognized";
    return false;
  }

  p = finger.fingerFastSearch();
  if (p != FINGERPRINT_OK) {
    message = "Fingerprint not recognized";
    return false;
  }

  matchedId = finger.fingerID;
  message = "Matched";
  return true;
}

void handleEnroll() {
  if (!server.hasArg("plain")) {
    sendJson(400, jsonError("Missing JSON body"));
    return;
  }

  StaticJsonDocument<128> req;
  DeserializationError error = deserializeJson(req, server.arg("plain"));
  if (error || !req.containsKey("id")) {
    sendJson(400, jsonError("Invalid body, expected {\"id\": number}"));
    return;
  }

  if (!req["id"].is<int>()) {
    sendJson(400, jsonError("Invalid body, expected {\"id\": number}"));
    return;
  }

  int id = req["id"];
  if (id < (int)MIN_FINGERPRINT_ID || id > (int)MAX_FINGERPRINT_ID) {
    sendJson(400, jsonError("ID must be 0-1000"));
    return;
  }

  String enrollMessage;

  if (!enrollFingerprintById((uint16_t)id, enrollMessage)) {
    lcdShow("Access Denied", "Enroll Failed");
    StaticJsonDocument<192> res;
    res["status"] = "error";
    res["message"] = enrollMessage;
    String out;
    serializeJson(res, out);
    sendJson(400, out);
    delay(1200);
    lcdShow("System Ready");
    return;
  }

  lcdShow("Access Granted", "Enroll OK");

  StaticJsonDocument<192> res;
  res["status"] = "success";
  res["message"] = "Enrollment complete";
  res["id"] = id;

  if (id >= (int)MIN_FINGERPRINT_ID && id <= (int)MAX_FINGERPRINT_ID) {
    knownIds[id] = true;
  }

  String out;
  serializeJson(res, out);
  sendJson(200, out);

  delay(1200);
  lcdShow("System Ready");
}

void handleVerify() {
  uint16_t matchedId = 0;
  String verifyMessage;

  if (!verifyFingerprintNow(matchedId, verifyMessage)) {
    lcdShow("Access Denied");

    StaticJsonDocument<192> res;
    res["status"] = "error";
    res["message"] = "Fingerprint not recognized";
    String out;
    serializeJson(res, out);
    sendJson(200, out);

    delay(1200);
    lcdShow("System Ready");
    return;
  }

  lcdShow("Access Granted", "ID " + String(matchedId));

  StaticJsonDocument<128> res;
  res["status"] = "success";
  res["id"] = matchedId;
  String out;
  serializeJson(res, out);
  sendJson(200, out);

  delay(1200);
  lcdShow("System Ready");
}

void handleUsers() {
  if (!idCacheReady) {
    buildIdCache();
  }

  String out = "{\"users\":[";
  bool first = true;

  for (uint16_t id = MIN_FINGERPRINT_ID; id <= MAX_FINGERPRINT_ID; id++) {
    if (knownIds[id]) {
      if (!first) {
        out += ",";
      }
      out += String(id);
      first = false;
    }
  }

  out += "]}";
  sendJson(200, out);
}

void handleHealth() {
  StaticJsonDocument<96> res;
  res["status"] = "ok";
  res["message"] = "ESP32 alive";
  String out;
  serializeJson(res, out);
  sendJson(200, out);
}

void handleDelete() {
  String uri = server.uri(); // expected: /delete/{id}
  const String prefix = "/delete/";

  if (!uri.startsWith(prefix) || uri.length() <= prefix.length()) {
    sendJson(400, jsonError("Invalid path, expected /delete/{id}"));
    return;
  }

  String idStr = uri.substring(prefix.length());
  if (!isAllDigits(idStr)) {
    sendJson(400, jsonError("Invalid ID"));
    return;
  }

  int id = idStr.toInt();
  if (id < (int)MIN_FINGERPRINT_ID || id > (int)MAX_FINGERPRINT_ID) {
    sendJson(400, jsonError("Invalid ID"));
    return;
  }

  uint8_t p = finger.deleteModel((uint16_t)id);
  if (p != FINGERPRINT_OK) {
    sendJson(400, jsonError("Delete failed"));
    return;
  }

  knownIds[id] = false;

  lcdShow("Deleted ID " + String(id));

  StaticJsonDocument<192> res;
  res["status"] = "success";
  res["message"] = "ID deleted";
  String out;
  serializeJson(res, out);
  sendJson(200, out);

  delay(1200);
  lcdShow("System Ready");
}

void handleDeleteAll() {
  if (!idCacheReady) {
    buildIdCache();
  }

  uint16_t deletedCount = 0;

  for (uint16_t id = MIN_FINGERPRINT_ID; id <= MAX_FINGERPRINT_ID; id++) {
    if (knownIds[id]) {
      uint8_t p = finger.deleteModel(id);
      if (p == FINGERPRINT_OK) {
        knownIds[id] = false;
        deletedCount++;
      }
    }
  }

  lcdShow("All Deleted", String(deletedCount) + " fingerprints");

  StaticJsonDocument<192> res;
  res["status"] = "success";
  res["message"] = "All fingerprints deleted";
  res["deleted"] = deletedCount;
  String out;
  serializeJson(res, out);
  sendJson(200, out);

  delay(1200);
  lcdShow("System Ready");
}

void handleNotFound() {
  sendJson(404, jsonError("Not found"));
}

void setupWifi() {
  WiFi.mode(WIFI_STA);

  if (USE_STATIC_IP) {
    if (!WiFi.config(localIP, gateway, subnet, dns)) {
      Serial.println("Failed to configure static IP");
    }
  } else {
    Serial.println("Using DHCP");
  }

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.print("Connected. IP: ");
  Serial.println(WiFi.localIP());
  lcdShow("WiFi Connected", WiFi.localIP().toString());
  delay(1500);
  lcdShow("System Ready");
}

void setupFingerprint() {
  FingerSerial.begin(57600, SERIAL_8N1, 16, 17);
  finger.begin(57600);

  if (finger.verifyPassword()) {
    Serial.println("Fingerprint sensor found");
    buildIdCache();
  } else {
    Serial.println("Fingerprint sensor NOT found");
    idCacheReady = false;
  }
}

void setupServer() {
  server.on("/enroll", HTTP_POST, handleEnroll);
  server.on("/enroll", HTTP_OPTIONS, handleOptions);
  server.on("/verify", HTTP_GET, handleVerify);
  server.on("/verify", HTTP_OPTIONS, handleOptions);
  server.on("/users", HTTP_GET, handleUsers);
  server.on("/users", HTTP_OPTIONS, handleOptions);
  server.on("/health", HTTP_GET, handleHealth);
  server.on("/health", HTTP_OPTIONS, handleOptions);

  server.on("/delete", HTTP_DELETE, []() {
    sendJson(400, jsonError("Use /delete/{id}"));
  });
  server.on("/delete", HTTP_OPTIONS, handleOptions);
  server.on("/delete-all", HTTP_DELETE, handleDeleteAll);
  server.on("/delete-all", HTTP_OPTIONS, handleOptions);
  server.onNotFound([]() {
    if (server.method() == HTTP_OPTIONS) {
      handleOptions();
      return;
    }
    if (server.method() == HTTP_DELETE && server.uri().startsWith("/delete/")) {
      handleDelete();
      return;
    }
    handleNotFound();
  });

  server.begin();
  Serial.println("HTTP server started on port 80");
}

void setup() {
  Serial.begin(115200);

  lcd.init();
  lcd.backlight();
  lcdShow("System Ready");

  setupWifi();
  setupFingerprint();
  setupServer();
}

void loop() {
  server.handleClient();
}
