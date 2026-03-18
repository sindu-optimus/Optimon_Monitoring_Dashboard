import axios from "axios";

const API_BASE = "http://18.170.60.107:8085/api/users";

// GET all users
export const getUsers = () => {
  return axios.get(`${API_BASE}/list`);
};

// GET single user
export const getUser = (id) => {
  return axios.get(`${API_BASE}/${id}`);
};

// CREATE user
export const createUser = (data) => {
  return axios.post(`${API_BASE}/create`, data);
};

// UPDATE user
export const updateUser = (id, data) => {
  return axios.put(`${API_BASE}/${id}`, data);
};

// DELETE user
export const deleteUser = (id) => {
  return axios.delete(`${API_BASE}/${id}`);
};