import axios from "axios";

// Define API URL based on environment with fallback
const baseURL = process.env.REACT_APP_API_URL?.trim() || 
  (window.location.hostname === 'localhost' 
    ? 'http://localhost:5000/api'
    : 'https://twiller-complete-project.onrender.com/api');

console.log("Using API base URL:", baseURL);

const API = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  }
});

// Add request interceptor to include auth token
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;

