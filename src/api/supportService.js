import axios from "axios";

const API_BASE = "http://18.170.60.107:8085/api/support-issues";

// GET all support issues
export const getSupportIssues = (isDeleted) => {
  return axios.get(`${API_BASE}/getall/${isDeleted}`);
};

// GET support issue by ID
export const getSupportIssue = (id) => {
  return axios.get(`${API_BASE}/${id}`);
};

// CREATE support issue
export const createSupportIssue = (data) => {
  return axios.post(`${API_BASE}/create`, data);
};

// UPDATE support issue
export const updateSupportIssue = (id, data) => {
  return axios.put(`${API_BASE}/${id}`, data);
};

// DELETE support issue
export const deleteSupportIssue = (id, data) => {
  return axios.delete(`${API_BASE}/${id}`, {
    data,
  });
};

