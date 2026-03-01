import axios from "axios";

// Create an axios instance with default config
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3005/api",
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
  /invalid (email|password|credentials|code)/i,
  /not found/i,
  /already exists/i,
  /password (requirements|must|policy)/i,
  /email must end with/i,
  /required/i,
  /unauthorized/i,
  /permission denied/i,
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

    // Return sanitized error - preserve response for status code checks
    const cleanError = {
      response: error.response,
      message: userMessage,
      status: status,
    };

    return Promise.reject(cleanError);
  },
);

export default api;
