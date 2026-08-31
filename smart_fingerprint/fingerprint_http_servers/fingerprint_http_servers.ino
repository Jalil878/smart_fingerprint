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
String lastSuccessfulLastname = "";
bool isScanSessionActive = false;
const unsigned long ACCESS_MESSAGE_DELAY_MS = 3000;

enum VerifyResult {
  VERIFY_MATCH = 0,
  VERIFY_NO_MATCH = 1,
  VERIFY_WAITING = 2,
  VERIFY_ERROR = 3,
};

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

String formatLastNameForLcd(String lastName) {
  lastName.trim();
  lastName.toUpperCase();
  return lastName.substring(0, 16);
}

String getStudentLastname(uint16_t fingerprintID) {
  (void)fingerprintID;
  return "Unknown";
}

void showPlaceFingerPrompt() {
  lcdShow("Place Finger", lastSuccessfulLastname);
}

void showAccessGrantedAndReturn(const String& lastName) {
  lcdShow("Access Granted", lastName);
  delay(ACCESS_MESSAGE_DELAY_MS);
  showPlaceFingerPrompt();
}

void showAccessDeniedAndReturn() {
  lcdShow("Access Denied", lastSuccessfulLastname);
  delay(ACCESS_MESSAGE_DELAY_MS);
  showPlaceFingerPrompt();
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

VerifyResult verifyFingerprintNow(uint16_t& matchedId, String& message) {
  uint8_t p = FINGERPRINT_NOFINGER;
  unsigned long start = millis();
  bool fingerPlaced = false;

  while (p != FINGERPRINT_OK) {
    p = finger.getImage();

    if (p == FINGERPRINT_OK) {
      fingerPlaced = true;
      break;
    }

    if (p == FINGERPRINT_NOFINGER || p == FINGERPRINT_PACKETRECIEVEERR) {
      if (millis() - start > 10000) {
        message = "Waiting for fingerprint";
        return VERIFY_WAITING;
      }
      delay(50);
      continue;
    }

    message = "Fingerprint scan failed";
    return VERIFY_ERROR;
  }

  if (!fingerPlaced) {
    message = "Waiting for fingerprint";
    return VERIFY_WAITING;
  }

  p = finger.image2Tz();
  if (p != FINGERPRINT_OK) {
    message = "Fingerprint not recognized";
    return VERIFY_NO_MATCH;
  }

  p = finger.fingerFastSearch();
  if (p != FINGERPRINT_OK) {
    message = "Fingerprint not recognized";
    return VERIFY_NO_MATCH;
  }

  matchedId = finger.fingerID;
  message = "Matched";
  return VERIFY_MATCH;
}

void handleStart() {
  lastSuccessfulLastname = "";
  isScanSessionActive = true;
  lcdShow("Place Finger", "");

  StaticJsonDocument<96> res;
  res["status"] = "success";
  res["message"] = "Scan session started";
  String out;
  serializeJson(res, out);
  sendJson(200, out);
}

void handleStop() {
  isScanSessionActive = false;
  lcdShow("System Ready", "");

  StaticJsonDocument<96> res;
  res["status"] = "success";
  res["message"] = "Scan session stopped";
  String out;
  serializeJson(res, out);
  sendJson(200, out);
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
  if (!isScanSessionActive) {
    isScanSessionActive = true;
    showPlaceFingerPrompt();
  }

  uint16_t matchedId = 0;
  String verifyMessage;
  VerifyResult verifyResult = verifyFingerprintNow(matchedId, verifyMessage);

  if (verifyResult == VERIFY_WAITING) {
    StaticJsonDocument<128> res;
    res["status"] = "waiting";
    res["message"] = "Waiting for fingerprint";
    String out;
    serializeJson(res, out);
    sendJson(200, out);
    return;
  }

  if (verifyResult == VERIFY_ERROR) {
    StaticJsonDocument<192> res;
    res["status"] = "error";
    res["message"] = verifyMessage;
    String out;
    serializeJson(res, out);
    sendJson(400, out);
    return;
  }

  if (verifyResult == VERIFY_NO_MATCH) {
    StaticJsonDocument<192> res;
    res["status"] = "error";
    res["message"] = "Fingerprint not recognized";
    String out;
    serializeJson(res, out);
    sendJson(200, out);

    showAccessDeniedAndReturn();
    return;
  }

  StaticJsonDocument<128> res;
  res["status"] = "success";
  res["id"] = matchedId;
  res["message"] = "Matched";
  String out;
  serializeJson(res, out);
  sendJson(200, out);
}

void handleDisplayName() {
  if (!server.hasArg("plain")) {
    sendJson(400, jsonError("Missing JSON body"));
    return;
  }

  StaticJsonDocument<160> req;
  DeserializationError error = deserializeJson(req, server.arg("plain"));
  if (error || !req.containsKey("last_name")) {
    sendJson(400, jsonError("Invalid body, expected {\"last_name\": string}"));
    return;
  }

  String lastName = req["last_name"].as<String>();
  lastName.trim();

  if (lastName.length() == 0) {
    sendJson(400, jsonError("last_name is required"));
    return;
  }

  if (!isScanSessionActive) {
    sendJson(409, jsonError("Scan session is not active. Press START first."));
    return;
  }

  lastSuccessfulLastname = formatLastNameForLcd(lastName);

  StaticJsonDocument<96> res;
  res["status"] = "success";
  res["message"] = "Name displayed";
  String out;
  serializeJson(res, out);
  sendJson(200, out);

  showAccessGrantedAndReturn(lastSuccessfulLastname);
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
  server.on("/start", HTTP_POST, handleStart);
  server.on("/start", HTTP_OPTIONS, handleOptions);
  server.on("/stop", HTTP_POST, handleStop);
  server.on("/stop", HTTP_OPTIONS, handleOptions);
  server.on("/enroll", HTTP_POST, handleEnroll);
  server.on("/enroll", HTTP_OPTIONS, handleOptions);
  server.on("/verify", HTTP_GET, handleVerify);
  server.on("/verify", HTTP_OPTIONS, handleOptions);
  server.on("/display-name", HTTP_POST, handleDisplayName);
  server.on("/display-name", HTTP_OPTIONS, handleOptions);
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
