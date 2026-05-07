const MESSAGE_TREND_API_BASE = "http://18.170.60.107:8085";

export const getServiceGraphData = async ({
  serviceName,
  trustId,
  groupBy,
  fromDate,
  toDate,
}) => {
  const searchParams = new URLSearchParams({
    serviceName,
    trustId: String(trustId),
    groupBy,
    fromDate,
    toDate,
  });

  const response = await fetch(
    `${MESSAGE_TREND_API_BASE}/api/inbound-metrics/service-graph?${searchParams.toString()}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch service graph data");
  }

  return response.json();
};
