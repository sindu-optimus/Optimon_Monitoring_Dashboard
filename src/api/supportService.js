import axios from "axios";

const API_BASE = "http://18.170.60.107:8085/api/support-issues";
const DEFAULT_LOOKBACK_DAYS = 7;

const getStartOfLookbackWindow = () => {
  const fromDate = new Date();
  fromDate.setHours(0, 0, 0, 0);
  fromDate.setDate(fromDate.getDate() - (DEFAULT_LOOKBACK_DAYS - 1));
  return fromDate;
};

const toApiDate = (date) => {
  const pad = (part) => String(part).padStart(2, "0");

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-");
};

const getDefaultDateParams = () => ({
  fromDate: toApiDate(getStartOfLookbackWindow()),
  toDate: toApiDate(new Date()),
});

// GET all support issues
export const getSupportIssues = (params = {}) => {
  return axios.get(`${API_BASE}/getall`, {
    params: {
      ...getDefaultDateParams(),
      ...params,
    },
  });
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

