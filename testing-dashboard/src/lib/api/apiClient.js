const apiBase = process.env.NEXT_PUBLIC_DASHBOARD_API_BASE || "/api";

/**
 * Universal API client for the Dashboard.
 * Automatically handles:
 *  - JSON requests
 *  - FormData file uploads
 *  - Auth tokens
 *  - Error normalization
 */
export async function apiClient(endpoint, options = {}) {
  const url = `${apiBase}${endpoint}`;
  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem("revclear-token")
      : null;

  // Detect whether this request uses FormData.
  const isFormData = options.body instanceof FormData;

  // Default headers ONLY when NOT FormData.
  const defaultHeaders = isFormData
    ? {}
    : {
        "Content-Type": "application/json",
      };

  if (token) {
    defaultHeaders["Authorization"] = `Bearer ${token}`;
  }

  if (options.body instanceof FormData) {
    delete defaultHeaders['Content-Type'];
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => ({})); // handle empty body

    if (!response.ok) {
      const error = new Error(data.error || `HTTP ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    console.error(`API Client Error (${endpoint}):`, error);
    throw error;
  }
}
