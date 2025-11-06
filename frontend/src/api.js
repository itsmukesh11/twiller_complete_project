import axios from "axios";

const baseURL =
  process.env.REACT_APP_API_URL?.trim() ||
  "https://twiller-complete-project.onrender.com/api";

console.log("Using API base URL:", baseURL);

const API = axios.create({
  baseURL,
});

export default API;

