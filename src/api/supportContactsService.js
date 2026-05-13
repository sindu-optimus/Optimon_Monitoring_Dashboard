import axios from "axios";

const API_BASE = "http://18.170.60.107:8085/api/support-contacts";

const getRequiredTrustParams = (trustId) => {
  if (trustId === undefined || trustId === null || trustId === "") {
    throw new Error("trustId is required");
  }

  return {
    trustId,
  };
};

export const getSupportContacts = (trustId) => {
  return axios.get(API_BASE, {
    params: getRequiredTrustParams(trustId),
  });
};

export const getSupportContactsByDirection = (direction, trustId) => {
  return axios.get(API_BASE, {
    params: {
      direction,
      ...getRequiredTrustParams(trustId),
    },
  });
};

export const getSupportContact = (id) => {
  return axios.get(`${API_BASE}/${id}`);
};

export const createSupportContact = (payload) => {
  return axios.post(API_BASE, payload);
};

export const updateSupportContact = (id, payload) => {
  return axios.put(`${API_BASE}/${id}`, payload);
};

export const deleteSupportContact = (id) => {
  return axios.delete(`${API_BASE}/${id}`);
};

export const getSupportContactsByInterfaceAndDirection = (
  interfaceId,
  direction
) => {
  return axios.get(
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
  return axios.get(`${API_BASE}/search`, {
    params: {
      ...getRequiredTrustParams(trustId),
      interfaceName,
      direction,
    },
  });
};
