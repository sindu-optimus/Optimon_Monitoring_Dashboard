import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "http://18.170.60.107:8085/api",
});

const getStoredUserToken = () => {
  const storedUser = localStorage.getItem("loggedInUser");

  if (!storedUser) {
    return "";
  }

  try {
    return JSON.parse(storedUser)?.token || "";
  } catch {
    return "";
  }
};

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token") || getStoredUserToken();

    if (token && !config.skipAuth) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export default axiosInstance;
