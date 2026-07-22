import axiosInstance from "./axiosInstance";

// LOGIN API
export const loginUser = ({ username, password }) => {
  return axiosInstance.post(
    "/login",
    {
      password,
      username,
    },
    { skipAuth: true }
  );
};

// FORGOT PASSWORD API
export const forgotPassword = ({ username, password }) => {
  return axiosInstance.post(
    "/forgotpassword",
    {
      password,
      username,
    },
    { skipAuth: true }
  );
};

// REFRESH TOKEN API
export const refreshAuthToken = (refreshToken) => {
  return axiosInstance.post(
    "/refresh-token",
    {
      refreshToken,
    },
    { skipAuth: true }
  );
};
