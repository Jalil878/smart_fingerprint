let ESP32_BASE_URL =
  import.meta.env.VITE_ESP32_BASE_URL ?? "http://192.168.254.157";

export function setEsp32BaseUrl(url) {
  if (url && typeof url === "string" && url.trim()) {
    ESP32_BASE_URL = url.trim().replace(/\/+$/, "");
  }
}

export function getEsp32BaseUrl() {
  return ESP32_BASE_URL;
}

const REQUEST_TIMEOUT_MS = 12000;
const ENROLL_TIMEOUT_MS = 60000;
const VERIFY_TIMEOUT_MS = 30000;
const DELETE_TIMEOUT_MS = 20000;
const DELETE_ALL_TIMEOUT_MS = 120000;
const HEALTH_TIMEOUT_MS = 8000;
const HEALTH_MAX_ATTEMPTS = 3;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(path, options = {}) {
  const { timeoutMs = REQUEST_TIMEOUT_MS, ...fetchOptions } = options;
  const url = `${ESP32_BASE_URL}${path}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...(fetchOptions.headers ?? {}),
      },
      ...fetchOptions,
      signal: controller.signal,
    });

    const raw = await response.text();
    const data = raw ? JSON.parse(raw) : {};

    if (!response.ok) {
      throw new Error(data.message ?? `Request failed (${response.status})`);
    }

    return data;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      if (path === "/users") {
        throw new Error(
          `Request timeout (${timeoutMs}ms): ${url}. The device may be busy scanning stored IDs.`,
        );
      }
      throw new Error(`Request timeout (${timeoutMs}ms): ${url}`);
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Cannot reach ${url}: ${message}`);
  } finally {
    clearTimeout(timeoutId);
  }
}

export function enrollFingerprint(id) {
  return request("/enroll", {
    method: "POST",
    body: JSON.stringify({ id }),
    timeoutMs: ENROLL_TIMEOUT_MS,
  });
}

export function verifyFingerprint() {
  return request("/verify", {
    method: "GET",
    timeoutMs: VERIFY_TIMEOUT_MS,
  });
}

export async function getStoredUsers() {
  const response = await request("/users", {
    method: "GET",
    timeoutMs: 30000,
  });

  return response.users ?? [];
}

export function deleteFingerprint(id) {
  return request(`/delete/${id}`, {
    method: "DELETE",
    timeoutMs: DELETE_TIMEOUT_MS,
  });
}

export function deleteAllFingerprints() {
  return request("/delete-all", {
    method: "DELETE",
    timeoutMs: DELETE_ALL_TIMEOUT_MS,
  });
}

export function pingEsp32() {
  return (async () => {
    let lastError = null;

    for (let attempt = 1; attempt <= HEALTH_MAX_ATTEMPTS; attempt += 1) {
      try {
        return await request("/health", {
          method: "GET",
          timeoutMs: HEALTH_TIMEOUT_MS,
        });
      } catch (error) {
        lastError = error;
        if (attempt < HEALTH_MAX_ATTEMPTS) {
          await wait(300 * attempt);
        }
      }
    }

    if (lastError instanceof Error) {
      throw lastError;
    }

    throw new Error("ESP32 health check failed");
  })();
}
