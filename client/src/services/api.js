import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
    withCredentials: true, // if cookies needed
});

// Optional: Add interceptors here (e.g., attach JWT token)

export default api;
