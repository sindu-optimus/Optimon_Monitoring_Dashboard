import axiosInstance from "./axiosInstance";

const API_BASE = "/trusts";

// GET all trusts
export const getTrusts = () => {
  return axiosInstance.get(`${API_BASE}/list`);
};

// CREATE trust
export const createTrust = (data) => {
  return axiosInstance.post(`${API_BASE}/createtrust`, data);
};

// UPDATE trust
export const updateTrust = (id, data) => {
  return axiosInstance.put(`${API_BASE}/${id}`, data);
};

// DELETE trust
export const deleteTrust = (id) => {
  return axiosInstance.delete(`${API_BASE}/${id}`);
};
