import axiosInstance from "./axiosInstance";

// const METRICS_API_BASE = "http://18.168.87.76:8084";
const METRICS_API_BASE = "http://18.168.87.76:8085";

const sendMetricMutation = async (endpoint, options = {}) => {
  const response = await axiosInstance({
    url: `${METRICS_API_BASE}${endpoint}`,
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    data: options.body,
    validateStatus: () => true,
  });

  if (response.status < 200 || response.status >= 300) {
    let errorMessage = "Failed to update metric details";

    const errorData = response.data;
    errorMessage = errorData?.message || errorData?.error || errorMessage;

    throw new Error(errorMessage);
  }

  const contentType = response.headers?.["content-type"] || "";
  if (contentType.includes("application/json")) {
    return response.data;
  }

  return null;
};

export const getMetricDetails = async (trustId) => {
  const response = await axiosInstance.get(
    `${METRICS_API_BASE}/getMetricDetails/?trustId=${trustId}`
  );

  if (response.status < 200 || response.status >= 300) {
    throw new Error("Failed to fetch metric details");
  }

  return response.data;
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
