import axiosInstance from "./axiosInstance";

const API_BASE = "/support-contacts";

const getRequiredTrustParams = (trustId) => {
  if (trustId === undefined || trustId === null || trustId === "") {
    throw new Error("trustId is required");
  }

  return {
    trustId,
  };
};

export const getSupportContacts = (trustId) => {
  return axiosInstance.get(API_BASE, {
    params: getRequiredTrustParams(trustId),
  });
};

export const getSupportContactsByDirection = (direction, trustId) => {
  return axiosInstance.get(API_BASE, {
    params: {
      direction,
      ...getRequiredTrustParams(trustId),
    },
  });
};

export const getSupportContact = (id) => {
  return axiosInstance.get(`${API_BASE}/${id}`);
};

export const createSupportContact = (payload) => {
  return axiosInstance.post(API_BASE, payload);
};

export const updateSupportContact = (id, payload) => {
  return axiosInstance.put(`${API_BASE}/${id}`, payload);
};

export const deleteSupportContact = (id) => {
  return axiosInstance.delete(`${API_BASE}/${id}`);
};

export const getSupportContactsByInterfaceAndDirection = (
  interfaceId,
  direction
) => {
  return axiosInstance.get(
    `${API_BASE}/interface/${encodeURIComponent(
      interfaceId
    )}/direction/${encodeURIComponent(direction)}`
  );
};

export const getSupportContactsByTrustInterfaceAndDirection = ({
  trustId,
  interfaceName,
  direction,
}) => {
  return axiosInstance.get(`${API_BASE}/search`, {
    params: {
      ...getRequiredTrustParams(trustId),
      interfaceName,
      direction,
    },
  });
};
