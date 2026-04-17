const METRICS_API_BASE = "http://18.168.87.76:8084";
// const METRICS_API_BASE = "http://18.170.60.107:8085";

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

export const getMetricDetails = async (trustId) => {
  const response = await fetch(
    `${METRICS_API_BASE}/getMetricDetails/?trustId=${trustId}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch metric details");
  }

  return response.json();
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
