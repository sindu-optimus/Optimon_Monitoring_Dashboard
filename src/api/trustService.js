import axios from "axios";

const API_BASE = "http://18.170.60.107:8085/api/trusts";

// GET all trusts
export const getTrusts = () => {
  return axios.get(`${API_BASE}/list`);
};

// CREATE trust
export const createTrust = (data) => {
  return axios.post(`${API_BASE}/createtrust`, data);
};

// UPDATE trust
export const updateTrust = (id, data) => {
  return axios.put(`${API_BASE}/${id}`, data);
};

// DELETE trust
export const deleteTrust = (id) => {
  return axios.delete(`${API_BASE}/${id}`);
};