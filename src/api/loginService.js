import axios from "axios";

const API_BASE = "http://18.170.60.107:8085/api";

// LOGIN API
export const loginUser = ({ username, password }) => {
  return axios.post(`${API_BASE}/login`, {
    password,
    username,
  });
};

// FORGOT PASSWORD API
export const forgotPassword = ({ username, password }) => {
  return axios.post(`${API_BASE}/forgotpassword`, {
    password,
    username,
  });
};
