const METRICS_API_BASE = "http://18.168.87.76:8084";
// const METRICS_API_BASE = "http://18.170.60.107:8085";
const CRITICAL_INBOUND_RECEIVERS_API_BASE =
  "http://18.170.60.107:8085/api/critical-inbound-receivers";
const CRITICAL_INTERFACES_API_BASE =
  "http://18.170.60.107:8085/api/critical-interfaces";

const isInboundInterface = (interfaceType) =>
  String(interfaceType).toUpperCase() === "INBOUND";

const sendMetricMutation = async (endpoint, options = {}) => {
  const response = await fetch(`${METRICS_API_BASE}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  if (!response.ok) {
    let errorMessage = "Failed to update metric details";

    try {
      const errorData = await response.json();
      errorMessage =
        errorData?.message || errorData?.error || errorMessage;
    } catch {
      // Keep the fallback message when the response body is not JSON.
    }

    throw new Error(errorMessage);
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  return null;
};

const sendCriticalInboundReceiverRequest = async (endpoint, options = {}) => {
  const response = await fetch(`${CRITICAL_INBOUND_RECEIVERS_API_BASE}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  if (!response.ok) {
    let errorMessage = "Failed to update critical inbound receiver";

    try {
      const errorData = await response.json();
      errorMessage = errorData?.message || errorData?.error || errorMessage;
    } catch {
      // Keep the fallback message when the response body is not JSON.
    }

    throw new Error(errorMessage);
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  return null;
};

const sendCriticalInterfaceRequest = async (endpoint, options = {}) => {
  const response = await fetch(`${CRITICAL_INTERFACES_API_BASE}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  if (!response.ok) {
    let errorMessage = "Failed to update critical interface";

    try {
      const errorData = await response.json();
      errorMessage = errorData?.message || errorData?.error || errorMessage;
    } catch {
      // Keep the fallback message when the response body is not JSON.
    }

    throw new Error(errorMessage);
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  return null;
};

export const getMetricDetails = async (trustId) => {
  const response = await fetch(
    `${METRICS_API_BASE}/getMetricDetails/?trustId=${trustId}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch metric details");
  }

  return response.json();
};

export const getCriticalInboundReceivers = async (params = {}) => {
  const searchParams = new URLSearchParams();

  if (params.trustId !== undefined && params.trustId !== null && params.trustId !== "") {
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

export const getCriticalInterfaces = async (params = {}) => {
  const searchParams = new URLSearchParams();

  if (params.trustId !== undefined && params.trustId !== null && params.trustId !== "") {
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

export const updateAllCriticalInboundReceiverAlerts = async (isDeleted) => {
  return sendCriticalInboundReceiverRequest(
    `/update-all-alerts?isDeleted=${encodeURIComponent(Boolean(isDeleted))}`,
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

export const updateAllCriticalInterfaceAlerts = async (isDeleted) => {
  return sendCriticalInterfaceRequest(
    `/update-all-isdeleted?isDeleted=${encodeURIComponent(Boolean(isDeleted))}`,
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
  trustId,
  interfaceType,
  interfaceId,
  payload,
}) => {
  if (isInboundInterface(interfaceType)) {
    return updateCriticalInboundReceiver(interfaceId, payload);
  }

  return updateCriticalInterfaceRecord(interfaceId, payload);
};

export const createCriticalInterface = async ({
  trustId,
  interfaceType,
  payload,
}) => {
  if (isInboundInterface(interfaceType)) {
    return createCriticalInboundReceiver(payload);
  }

  return createCriticalInterfaceRecord(payload);
};

export const deleteCriticalInterface = async ({
  trustId,
  interfaceType,
  interfaceId,
}) => {
  if (isInboundInterface(interfaceType)) {
    return deleteCriticalInboundReceiver(interfaceId);
  }

  return deleteCriticalInterfaceRecord(interfaceId);
};

export const extractInterfaceNamesFromMetrics = (data) => {
  return Array.from(
    new Set(
      (Array.isArray(data?.queueDetails) ? data.queueDetails : [])
        .map((item) =>
          typeof item?.queueName === "string" ? item.queueName.trim() : ""
        )
        .filter(Boolean)
        .filter((name) => !/^no pending/i.test(name))
    )
  ).sort((a, b) => a.localeCompare(b));
};
