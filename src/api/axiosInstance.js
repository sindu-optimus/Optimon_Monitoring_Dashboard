import axios from "axios";

const API_ORIGIN = "http://18.168.87.76:8085";

const axiosInstance = axios.create({
  baseURL: `${API_ORIGIN}/api`,
});

// A small number of legacy endpoints live outside the /api path.
export const rootAxiosInstance = axios.create({
  baseURL: API_ORIGIN,
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

const addAuthInterceptor = (client) =>
  client.interceptors.request.use(
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

addAuthInterceptor(axiosInstance);
addAuthInterceptor(rootAxiosInstance);

export default axiosInstance;
