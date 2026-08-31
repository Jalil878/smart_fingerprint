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
const DELETE_TIMEOUT_MS = 20000;
const DELETE_ALL_TIMEOUT_MS = 120000;
const HEALTH_TIMEOUT_MS = 8000;
const HEALTH_MAX_ATTEMPTS = 3;

// Controller for the active verify request so it can be aborted on stop
let verifyController = null;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseResponseBody(raw) {
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    return { message: raw };
  }
}

function parseVerifyBody(raw) {
  const parsed = parseResponseBody(raw);

  if (parsed && typeof parsed === "object" && parsed.id !== undefined) {
    return parsed;
  }

  const text =
    typeof parsed?.message === "string"
      ? parsed.message
      : typeof raw === "string"
        ? raw
        : "";

  const idMatch = text.match(
    /(?:finger(?:print)?(?:[_\s-]?id)?|id)\D*(\d+)/i,
  );

  if (idMatch) {
    return { ...parsed, id: Number(idMatch[1]) };
  }

  return parsed;
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
    const data = parseResponseBody(raw);

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
  // Use a dedicated controller so stopScanning() can abort this specific request
  verifyController = new AbortController();
  const url = `${ESP32_BASE_URL}/verify`;
  const signal = verifyController.signal;

  return fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    signal,
    // No timeout — wait as long as the device needs to get a fingerprint
  })
    .then(async (response) => {
      // Check abort again before processing response
      if (signal.aborted) throw new Error("SCAN_STOPPED");
      const raw = await response.text();
      const data = parseVerifyBody(raw);
      if (!response.ok) {
        throw new Error(data.message ?? `Request failed (${response.status})`);
      }
      return data;
    })
    .catch((error) => {
      if (
        (error instanceof Error && error.name === "AbortError") ||
        signal.aborted
      ) {
        // Scan was stopped intentionally — throw a recognisable sentinel
        throw new Error("SCAN_STOPPED");
      }
      // Re-throw SCAN_STOPPED sentinel from .then() above without wrapping
      if (error instanceof Error && error.message === "SCAN_STOPPED") {
        throw error;
      }
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Cannot reach ${url}: ${message}`);
    })
    .finally(() => {
      verifyController = null;
    });
}

export function stopScanning() {
  // Abort any in-flight verify request immediately (cancels the browser fetch)
  if (verifyController) {
    verifyController.abort();
    verifyController = null;
  }

  // Tell the device to stop scanning — fire-and-forget, do NOT await
  // so the UI responds instantly without waiting for the device to reply.
  fetch(`${ESP32_BASE_URL}/stop`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  }).catch(() => {
    // Device may not support /stop or may be unreachable — ignore
  });
}

export function startScanning() {
  return request("/start", {
    method: "POST",
    timeoutMs: 4000,
  });
}

export function showMatchedStudentOnDevice(lastName) {
  const value = String(lastName ?? "").trim();
  if (!value) {
    return Promise.resolve({ status: "skipped" });
  }

  return request("/display-name", {
    method: "POST",
    body: JSON.stringify({ last_name: value }),
    timeoutMs: 4000,
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
