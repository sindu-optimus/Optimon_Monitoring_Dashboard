import axios from "axios";

const API_BASE = "http://18.170.60.107:8085/api/login";

// CREATE user login
export const createTrust = (data) => {
  return axios.post(`${API_BASE}/createtrust`, data);
};