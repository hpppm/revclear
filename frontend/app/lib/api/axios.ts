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

// Response interceptor to handle errors gracefully
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Suppress 401 errors from appearing in console
        // These are expected when user is not authenticated
        if (error?.response?.status === 401) {
            // Create a clean error object without the full axios error details
            const cleanError = {
                response: error.response,
                message: error.message,
                status: 401
            };
            return Promise.reject(cleanError);
        }
        return Promise.reject(error);
    }
);

export default api;
