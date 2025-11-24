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

export default api;
