// Internal helper functions
function shouldRedactKey(key) {
  if (!key) return false;
  const normalized = key.toLowerCase();
  return [
    "accesstoken",
    "idtoken",
    "refreshtoken",
    "authorization",
    "token",
    "password",
    "secret",
    "clientsecret",
    "email",
  ].includes(normalized);
}

function looksLikeJwt(value) {
  if (typeof value !== "string") return false;
  return value.startsWith("eyJ") && value.split(".").length >= 2;
}

function looksLikeCredential(value) {
  if (typeof value !== "string") return false;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(value);
}

function redactValue(_value) {
  return "[redacted]";
}

function redactString(value) {
  if (typeof value !== "string") {
    return "[redacted]";
  }
  return value.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[redacted]");
}

function sanitizePayload(payload) {
  if (payload === null || payload === undefined) {
    return payload;
  }
  if (Array.isArray(payload)) {
    return payload.map(sanitizePayload);
  }
  if (typeof payload === "object") {
    const clone = {};
    Object.keys(payload).forEach(function (key) {
      const value = payload[key];
      if (value && typeof value === "object") {
        clone[key] = sanitizePayload(value);
      } else if (
        shouldRedactKey(key) ||
        looksLikeJwt(value) ||
        looksLikeCredential(value)
      ) {
        clone[key] = redactValue(value);
      } else {
        clone[key] = value;
      }
    });
    return clone;
  }
  if (looksLikeJwt(payload) || looksLikeCredential(payload)) {
    return redactValue(payload);
  }
  return payload;
}

function sanitizeMessage(message, details) {
  const base = message || "Event";
  const safeDetails = sanitizePayload(details);
  if (!safeDetails || typeof safeDetails !== "object") {
    return redactString(base);
  }
  const summary = [];
  if (safeDetails.status) {
    summary.push("status=" + safeDetails.status);
  }
  if (safeDetails.message) {
    summary.push("msg=" + safeDetails.message);
  }
  if (safeDetails.health) {
    summary.push(
      "health=" +
        Object.keys(safeDetails.health)
          .map(function (key) {
            const value = safeDetails.health[key];
            const configured = value && value.configured ? "running" : "pending";
            return key + ":" + configured;
          })
          .join("|")
    );
  }
  if (!summary.length && safeDetails.error) {
    summary.push("error=" + safeDetails.error);
  }
  return redactString(base + (summary.length ? " — " + summary.join(" ") : ""));
}

/**
 * Logs a message to the dashboard's log container.
 * @param {HTMLElement} logContainer - The DOM element to log messages to.
 * @param {string} message - The message to log.
 * @param {string} type - The type of log (e.g., 'info', 'success', 'error').
 * @param {any} details - Optional details to include in the log.
 */
export function log(logContainer, message, type, details) {
  if (!logContainer) return;
  const entry = document.createElement("div");
  entry.className = "log-entry " + (type || "info");
  const timestamp = new Date().toISOString();
  entry.innerHTML = "<strong>[" + timestamp + "] " + sanitizeMessage(message, details) + "</strong>";
  logContainer.prepend(entry);
  while (logContainer.childElementCount > 12) {
    logContainer.removeChild(logContainer.lastChild);
  }
}
