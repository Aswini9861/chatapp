import axios from "axios";

const refreshToken = JSON.parse(localStorage.getItem("accessToken"))


export const axiosApi = axios.create({
    baseURL: import.meta.env.VITE_APP_API_URL,
    headers: { 'Content-Type': 'application/json',Authorization: `Bearer ${refreshToken}` },
});