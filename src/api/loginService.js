import axios from "axios";

const API_BASE = "http://18.170.60.107:8085/api";

// LOGIN API (uses query params)
export const loginUser = (username, password) => {
  return axios.post(`${API_BASE}/login`, null, {
    params: {
      username,
      password,
    },
  });
};