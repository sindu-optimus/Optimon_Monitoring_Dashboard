const INTERFACE_STATS_API_BASE = "http://18.170.60.107:8085";
export const SERVICE_TREND_METRIC = "maxTimeDelay";
export const QUEUE_TREND_METRIC = "maxPendingQueueCount";

export const toApiDateTime = (value, fallbackTime) => {
  if (!value) {
    return "";
  }

  const normalizedValue = String(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
    return `${normalizedValue}T${fallbackTime}`;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalizedValue)) {
    return `${normalizedValue}:00`;
  }

  return normalizedValue;
};

export const getServiceGraphData = async ({
  serviceName,
  trustId,
  groupBy,
  from,
  to,
}) => {
  const searchParams = new URLSearchParams({
    serviceName,
    trustId: String(trustId),
    groupBy,
    from: toApiDateTime(from, "00:00:00"),
    to: toApiDateTime(to, "23:59:59"),
  });

  const response = await fetch(
    `${INTERFACE_STATS_API_BASE}/api/inbound-metrics/service-graph?${searchParams.toString()}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch service graph data");
  }

  return response.json();
};

export const getQueueGraphData = async ({
  queueName,
  trustId,
  groupBy,
  from,
  to,
  fromDateTime,
  toDateTime,
}) => {
  const searchParams = new URLSearchParams({
    queueName,
    trustId: String(trustId),
    groupBy,
    fromDateTime: toApiDateTime(fromDateTime ?? from, "00:00:00"),
    toDateTime: toApiDateTime(toDateTime ?? to, "23:59:59"),
  });

  const response = await fetch(
    `${INTERFACE_STATS_API_BASE}/api/queue-metrics/queue-graph?${searchParams.toString()}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch queue graph data");
  }

  return response.json();
};
