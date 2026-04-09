import axios from "axios";

const defaultApiBaseUrl =
  process.env.NODE_ENV === "development" ? "http://localhost:3005/api" : "/api";

// Create an axios instance with default config
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || defaultApiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
  // SECURITY: Send httpOnly cookies with all requests
  withCredentials: true,
});

// Request interceptor - tokens are sent automatically via httpOnly cookies
// (withCredentials: true above). No manual token handling needed.
api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error),
);

// Helper function to get user-friendly error messages
function getGenericErrorMessage(status?: number): string {
  switch (status) {
    case 400:
      return "Invalid request. Please check your input.";
    case 401:
      return "Authentication required. Please log in again.";
    case 403:
      return "You do not have permission to perform this action.";
    case 404:
      return "The requested resource was not found.";
    case 409:
      return "This operation conflicts with existing data.";
    case 422:
      return "The submitted data is invalid.";
    case 429:
      return "Too many requests. Please wait and try again.";
    case 500:
      return "A server error occurred. Please try again later.";
    case 503:
      return "Service temporarily unavailable. Please try again later.";
    default:
      return "An unexpected error occurred.";
  }
}

// Whitelist of safe error message patterns from backend
const SAFE_ERROR_PATTERNS = [
  /invalid (email|password|credentials|code|invitation)/i,
  /not found/i,
  /already exists/i,
  /already belongs to an organization/i,
  /already a member/i,
  /must create or join/i,
  /invitation code/i,
  /password (requirements|must|policy)/i,
  /email must end with/i,
  /required/i,
  /unauthorized/i,
  /permission denied/i,
  /no fields to update/i,
  /code expired/i,
  /open your authenticator/i,
  /audio/i,
  /transcrib/i,
  /unsupported/i,
  /upload/i,
  /encounter id/i,
  /service failed/i,
  /temporarily unavailable/i,
];

function sanitizeErrorMessage(
  message: string | undefined,
  status?: number,
): string {
  if (!message) return getGenericErrorMessage(status);
  if (SAFE_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
    return message;
  }
  return getGenericErrorMessage(status);
}

// Response interceptor to handle errors gracefully
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const backendMessage =
      error?.response?.data?.error || error?.response?.data?.message;

    // Sanitize - only pass through known-safe error messages
    const userMessage = sanitizeErrorMessage(backendMessage, status);

    // AUTO-LOGOUT: Redirect to login when session cookie has expired.
    // Only fires on dashboard routes to avoid loops on login/signup/landing.
    // Auth routes (e.g. /auth/signin) are excluded — a wrong password returns
    // 401 and the login page must handle that itself, not get redirected away.
    if (status === 401 && typeof window !== "undefined") {
      const isAuthRoute = error?.config?.url?.includes("/auth/");
      const isDashboard = window.location.pathname.startsWith("/dashboard");
      if (!isAuthRoute && isDashboard) {
        window.location.href = "/login?reason=expired";
      }
    }

    // SANITIZATION: Replace raw response.data with the sanitized message so
    // that callers reading error.response.data.error never see raw backend
    // output (stack traces, DB details, internal paths, etc.).
    // EXCEPTION: Preserve structured Zod validation errors array so callers
    // can display field-level messages (e.g. org/patient create forms).
    const zodErrors = Array.isArray(error?.response?.data?.errors)
      ? error.response.data.errors
      : undefined;
    const cleanError = {
      response: error.response
        ? {
            ...error.response,
            data: { error: userMessage, ...(zodErrors ? { errors: zodErrors } : {}) },
          }
        : undefined,
      message: userMessage,
      status: status,
    };

    return Promise.reject(cleanError);
  },
);

export default api;
