const CRITICAL_INTERFACES_API_BASE =
  "http://18.170.60.107:8085/api/critical-interfaces";
const CRITICAL_INBOUND_RECEIVERS_API_BASE =
  "http://18.170.60.107:8085/api/critical-inbound-receivers";

const isInboundInterface = (interfaceType) =>
  String(interfaceType).toUpperCase() === "INBOUND";

const getRequestBodyForLog = (body) => {
  if (typeof body !== "string") {
    return body;
  }

  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
};

const sendCriticalApiRequest = async ({
  apiName,
  baseUrl,
  endpoint,
  options = {},
  fallbackErrorMessage,
}) => {
  const url = `${baseUrl}${endpoint}`;
  const method = options.method || "GET";
  const logDetails = {
    apiName,
    method,
    url,
    body: getRequestBodyForLog(options.body),
  };

  // console.log("[CriticalInterfaces API] Request:", logDetails);

  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
      },
      ...options,
    });

    const contentType = response.headers.get("content-type") || "";
    const responseData = contentType.includes("application/json")
      ? await response.json()
      : null;

    if (!response.ok) {
      const errorMessage =
        responseData?.message || responseData?.error || fallbackErrorMessage;

      console.error("[CriticalInterfaces API] Error:", {
        ...logDetails,
        status: response.status,
        response: responseData,
        errorMessage,
      });

      throw new Error(errorMessage);
    }

    // console.log("[CriticalInterfaces API] Response:", {
    //   ...logDetails,
    //   status: response.status,
    //   response: responseData,
    // });

    return responseData;
  } catch (error) {
    if (error instanceof Error) {
      console.error("[CriticalInterfaces API] Failed:", {
        ...logDetails,
        error: error.message,
      });
    }

    throw error;
  }
};

const sendCriticalInterfaceRequest = async (endpoint, options = {}) => {
  return sendCriticalApiRequest({
    apiName: "critical-interfaces",
    baseUrl: CRITICAL_INTERFACES_API_BASE,
    endpoint,
    options,
    fallbackErrorMessage: "Failed to update critical interface",
  });
};

const sendCriticalInboundReceiverRequest = async (endpoint, options = {}) => {
  return sendCriticalApiRequest({
    apiName: "critical-inbound-receivers",
    baseUrl: CRITICAL_INBOUND_RECEIVERS_API_BASE,
    endpoint,
    options,
    fallbackErrorMessage: "Failed to update critical inbound receiver",
  });
};

export const getCriticalInterfaces = async (params = {}) => {
  const searchParams = new URLSearchParams();

  if (
    params.trustId !== undefined &&
    params.trustId !== null &&
    params.trustId !== ""
  ) {
    searchParams.set("trustId", String(params.trustId));
  }

  if (typeof params.isDeleted === "boolean") {
    searchParams.set("isDeleted", String(params.isDeleted));
  }

  const queryString = searchParams.toString();

  return sendCriticalInterfaceRequest(
    `/getall${queryString ? `?${queryString}` : ""}`
  );
};

export const getCriticalInboundReceivers = async (params = {}) => {
  const searchParams = new URLSearchParams();

  if (
    params.trustId !== undefined &&
    params.trustId !== null &&
    params.trustId !== ""
  ) {
    searchParams.set("trustId", String(params.trustId));
  }

  if (typeof params.isDeleted === "boolean") {
    searchParams.set("isDeleted", String(params.isDeleted));
  }

  const queryString = searchParams.toString();

  return sendCriticalInboundReceiverRequest(
    `/getall${queryString ? `?${queryString}` : ""}`
  );
};

export const getCriticalInboundReceiverById = async (id) => {
  return sendCriticalInboundReceiverRequest(`/${id}`);
};

export const createCriticalInboundReceiver = async (payload) => {
  return sendCriticalInboundReceiverRequest("/create", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const updateCriticalInboundReceiver = async (id, payload) => {
  return sendCriticalInboundReceiverRequest(`/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
};

export const updateCriticalInboundReceiverAlert = async (id, isDeleted) => {
  return sendCriticalInboundReceiverRequest(
    `/update-alert?id=${encodeURIComponent(id)}&isDeleted=${encodeURIComponent(
      Boolean(isDeleted)
    )}`,
    {
      method: "PUT",
    }
  );
};

export const updateAllCriticalInboundReceiverAlerts = async ({
  isDeleted,
  trustId,
} = {}) => {
  const searchParams = new URLSearchParams();
  searchParams.set("isDeleted", String(Boolean(isDeleted)));

  if (trustId !== undefined && trustId !== null && trustId !== "") {
    searchParams.set("trustId", String(trustId));
  }

  return sendCriticalInboundReceiverRequest(
    `/update-all-alerts?${searchParams.toString()}`,
    {
      method: "PUT",
    }
  );
};

export const deleteCriticalInboundReceiver = async (id) => {
  return sendCriticalInboundReceiverRequest(`/${id}`, {
    method: "DELETE",
  });
};

export const getCriticalInterfaceById = async (id) => {
  return sendCriticalInterfaceRequest(`/${id}`);
};

export const createCriticalInterfaceRecord = async (payload) => {
  return sendCriticalInterfaceRequest("/create", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const updateCriticalInterfaceRecord = async (id, payload) => {
  return sendCriticalInterfaceRequest(`/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
};

export const deleteCriticalInterfaceRecord = async (id) => {
  return sendCriticalInterfaceRequest(`/${id}`, {
    method: "DELETE",
  });
};

export const updateAllCriticalInterfaceAlerts = async ({
  isDeleted,
  trustId,
} = {}) => {
  const searchParams = new URLSearchParams();
  searchParams.set("isDeleted", String(Boolean(isDeleted)));

  if (trustId !== undefined && trustId !== null && trustId !== "") {
    searchParams.set("trustId", String(trustId));
  }

  return sendCriticalInterfaceRequest(
    `/update-all-isdeleted?${searchParams.toString()}`,
    {
      method: "PUT",
    }
  );
};

export const updateCriticalInterfaceAlert = async (id, isDeleted) => {
  return sendCriticalInterfaceRequest(
    `/soft-delete?id=${encodeURIComponent(id)}&isDeleted=${encodeURIComponent(
      Boolean(isDeleted)
    )}`,
    {
      method: "PUT",
    }
  );
};

export const updateCriticalInterface = async ({
  interfaceType,
  interfaceId,
  payload,
}) => {
  if (isInboundInterface(interfaceType)) {
    return updateCriticalInboundReceiver(interfaceId, payload);
  }

  return updateCriticalInterfaceRecord(interfaceId, payload);
};

export const createCriticalInterface = async ({ interfaceType, payload }) => {
  if (isInboundInterface(interfaceType)) {
    return createCriticalInboundReceiver(payload);
  }

  return createCriticalInterfaceRecord(payload);
};

export const deleteCriticalInterface = async ({
  interfaceType,
  interfaceId,
}) => {
  if (isInboundInterface(interfaceType)) {
    return deleteCriticalInboundReceiver(interfaceId);
  }

  return deleteCriticalInterfaceRecord(interfaceId);
};
