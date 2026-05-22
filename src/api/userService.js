import axiosInstance from "./axiosInstance";

const API_BASE = "/users";

// GET all users
export const getUsers = () => {
  return axiosInstance.get(`${API_BASE}/list`);
};

// GET single user
export const getUser = (id) => {
  return axiosInstance.get(`${API_BASE}/${id}`);
};

// CREATE user
export const createUser = (data) => {
  return axiosInstance.post(`${API_BASE}/create`, data);
};

// UPDATE user
export const updateUser = (id, data) => {
  return axiosInstance.put(`${API_BASE}/${id}`, data);
};

// DELETE user
export const deleteUser = (id) => {
  return axiosInstance.delete(`${API_BASE}/${id}`);
};
