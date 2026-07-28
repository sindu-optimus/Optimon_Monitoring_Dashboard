import axiosInstance from "./axiosInstance";

export const getTrustBauRecipients = (trustId) =>
  axiosInstance.get("/trust-bau", {
    params: { trustId },
  });
