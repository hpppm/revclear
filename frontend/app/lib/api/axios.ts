import axios from "axios";

// Create an axios instance with default config
const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3005/api",
    headers: {
        "Content-Type": "application/json",
    },
});

// Request interceptor to add the auth token to every request
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Helper function to get user-friendly error messages
function getGenericErrorMessage(status?: number): string {
    switch (status) {
        case 400: return 'Invalid request. Please check your input.';
        case 401: return 'Authentication required. Please log in again.';
        case 403: return 'You do not have permission to perform this action.';
        case 404: return 'The requested resource was not found.';
        case 500: return 'A server error occurred. Please try again later.';
        case 503: return 'Service temporarily unavailable. Please try again later.';
        default: return 'An unexpected error occurred.';
    }
}

// Response interceptor to handle errors gracefully
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error?.response?.status;

        // Sanitize error message - don't expose backend internals
        const userMessage = error?.response?.data?.message || getGenericErrorMessage(status);

        // Only log detailed errors in development
        if (process.env.NODE_ENV !== 'production') {
            console.error('[API Error]', {
                status,
                url: error?.config?.url,
                message: error?.message,
                data: error?.response?.data
            });
        }

        // Return sanitized error
        const cleanError = {
            response: error.response,
            message: userMessage,
            status: status
        };

        return Promise.reject(cleanError);
    }
);

export default api;
