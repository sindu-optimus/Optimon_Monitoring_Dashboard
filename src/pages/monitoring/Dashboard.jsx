import React, { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  QUEUE_TREND_METRIC,
  SERVICE_TREND_METRIC,
  getQueueGraphData,
  getServiceGraphData,
  toApiDateTime,
} from "../../api/interfaceStatsService";
import "./Dashboard.css";

const HEALTH_THRESHOLD = 100;
const DEFAULT_GROUP_BY = "FIVE_MINUTES";
const DEFAULT_TIME_RANGE_HOURS = 24;

const padDatePart = (part) => String(part).padStart(2, "0");

const toDateTimeInputValue = (date) => {
  const datePart = [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
  ].join("-");
  const timePart = [
    padDatePart(date.getHours()),
    padDatePart(date.getMinutes()),
    padDatePart(date.getSeconds()),
  ].join(":");

  return `${datePart}T${timePart}`;
};

const getDateRangeForHours = (hours) => {
  const to = new Date();
  const from = new Date(to);
  from.setHours(from.getHours() - Number(hours || DEFAULT_TIME_RANGE_HOURS));

  return {
    fromDateTime: toDateTimeInputValue(from),
    toDateTime: toDateTimeInputValue(to),
  };
};

const formatGroupLabel = (value) =>
  String(value)
    .split("_")
    .map((part) => part[0] + part.slice(1).toLowerCase())
    .join(" ");

const isTimeBasedGroup = (groupBy) =>
  groupBy === "FIVE_MINUTES" ||
  groupBy === "THIRTY_MINUTES" ||
  groupBy === "HOURLY";

const formatChartAxisLabel = (label, groupBy) => {
  if (!label) {
    return "";
  }

  const normalizedLabel = String(label).replace(" ", "T");
  const date = new Date(normalizedLabel);

  if (Number.isNaN(date.getTime())) {
    return String(label);
  }

  if (isTimeBasedGroup(groupBy)) {
    const datePart = date.toLocaleDateString([], {
      month: "short",
      day: "2-digit",
    });
    const timePart = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    return `${datePart} ${timePart}`;
  }

  if (groupBy === "MONTHLY") {
    return date.toLocaleDateString([], {
      month: "short",
      year: "numeric",
    });
  }

  return date.toLocaleDateString([], {
    month: "short",
    day: "2-digit",
  });
};

const formatChartTooltipLabel = (label, groupBy) => {
  if (!label) {
    return "";
  }

  const normalizedLabel = String(label).replace(" ", "T");
  const date = new Date(normalizedLabel);

  if (Number.isNaN(date.getTime())) {
    return String(label);
  }

  if (isTimeBasedGroup(groupBy)) {
    return date.toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  }

  if (groupBy === "MONTHLY") {
    return date.toLocaleDateString([], {
      month: "short",
      year: "numeric",
    });
  }

  return date.toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

const getGraphLabel = (item) =>
  item?.label ?? item?.createdOn ?? item?.date ?? item?.timestamp ?? "";

const getGraphDate = (item) => {
  const label = getGraphLabel(item);

  if (!label) {
    return null;
  }

  const date = new Date(String(label).replace(" ", "T"));

  return Number.isNaN(date.getTime()) ? null : date;
};

const isWithinDateTimeRange = (item, fromDateTime, toDateTime) => {
  const date = getGraphDate(item);

  if (!date) {
    return true;
  }

  const from = fromDateTime ? new Date(fromDateTime) : null;
  const to = toDateTime ? new Date(toDateTime) : null;

  if (from && !Number.isNaN(from.getTime()) && date < from) {
    return false;
  }

  if (to && !Number.isNaN(to.getTime()) && date > to) {
    return false;
  }

  return true;
};

const getGraphTimestamp = (item) => {
  const date = getGraphDate(item);

  return date ? date.getTime() : Number.MAX_SAFE_INTEGER;
};

const unwrapApiData = (response) => response?.data ?? response;

const getGraphRows = (response) => {
  const data = unwrapApiData(response);
  const list =
    data?.data ??
    data?.content ??
    data?.items ??
    data?.graphData ??
    data?.serviceGraphData ??
    data?.queueGraphData ??
    data?.metrics ??
    data;

  return Array.isArray(list) ? list : [];
};

const getNumber = (value) => Number(value) || 0;

const getQueueValue = (item) =>
  getNumber(item?.[QUEUE_TREND_METRIC]);

const getServiceValue = (item) =>
  getNumber(item?.[SERVICE_TREND_METRIC]);

const getHealthStatus = (rows) =>
  rows.some((item) => getNumber(item?.value) > HEALTH_THRESHOLD)
    ? "Critical"
    : "Healthy";

const MOCK_DASHBOARD_DATA = {
  lastEmail: {
    sent: true,
    time: "Dec 23, 2025 10:42 AM",
  },
};

const Dashboard = () => {
  const { id } = useParams();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const { queueName: stateQueueName, aliasName: stateAliasName } =
    location.state || {};
  const {
    serviceName: stateServiceName,
    interfaceName: stateInterfaceName,
    trustId: stateTrustId,
    trustName: stateTrustName,
    direction: stateDirection,
  } = location.state || {};
  const queueName = stateQueueName || searchParams.get("queueName");
  const aliasName = stateAliasName || searchParams.get("aliasName");
  const direction = stateDirection || searchParams.get("direction") || "";
  const isQueueDashboard =
    String(direction).toUpperCase() === "OUTBOUND" || Boolean(queueName);
  const serviceName =
    (isQueueDashboard
      ? queueName || stateInterfaceName || searchParams.get("interfaceName")
      : stateServiceName ||
        searchParams.get("serviceName") ||
        stateInterfaceName ||
        searchParams.get("interfaceName")) || "";
  const trustId = stateTrustId || searchParams.get("trustId") || "";
  const trustName = stateTrustName || searchParams.get("trustName") || "";
  const interfaceActualName = isQueueDashboard ? queueName : serviceName;
  const interfaceAliasName = aliasName || interfaceActualName;
  const displayName =
    interfaceAliasName && interfaceActualName
      ? `${interfaceAliasName} (${interfaceActualName})`
      : interfaceAliasName || id;
  const [dashboardData, setDashboardData] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendError, setTrendError] = useState("");

  useEffect(() => {
    // simulate API delay
    const timer = setTimeout(() => {
      setDashboardData(MOCK_DASHBOARD_DATA);
    }, 500);

    return () => clearTimeout(timer);
  }, [id]);

  useEffect(() => {
    const loadDashboardTrend = async () => {
      if (!serviceName || !trustId) {
        setTrendData([]);
        setTrendError("");
        console.warn("[Dashboard] Missing graph params:", {
          interfaceName: serviceName,
          interfaceType: isQueueDashboard ? "QUEUE" : "SERVICE",
          trustId,
        });
        return;
      }

      const { fromDateTime, toDateTime } = getDateRangeForHours(
        DEFAULT_TIME_RANGE_HOURS
      );
      const from = toApiDateTime(fromDateTime, "00:00:00");
      const to = toApiDateTime(toDateTime, "23:59:59");
      const params = {
        trustId,
        groupBy: DEFAULT_GROUP_BY,
      };

      try {
        setTrendLoading(true);
        setTrendError("");
        const requestParams = isQueueDashboard
          ? {
              queueName: serviceName,
              ...params,
              fromDateTime: from,
              toDateTime: to,
            }
          : {
              serviceName,
              ...params,
              from,
              to,
            };

        console.log("[Dashboard] Graph query params:", requestParams);

        const response = isQueueDashboard
          ? await getQueueGraphData(requestParams)
          : await getServiceGraphData(requestParams);
        const rows = getGraphRows(response)
          .filter((item) =>
            isWithinDateTimeRange(item, fromDateTime, toDateTime)
          )
          .map((item) => {
            const graphLabel = getGraphLabel(item);

            return {
              label: formatChartAxisLabel(graphLabel, DEFAULT_GROUP_BY),
              tooltipLabel: formatChartTooltipLabel(
                graphLabel,
                DEFAULT_GROUP_BY
              ),
              value: isQueueDashboard
                ? getQueueValue(item)
                : getServiceValue(item),
              timestamp: getGraphTimestamp(item),
            };
          })
          .sort((left, right) => left.timestamp - right.timestamp)
          .map(({ label, tooltipLabel, value }) => ({
            label,
            tooltipLabel,
            value,
          }));

        setTrendData(rows);
      } catch (error) {
        console.error("Error loading dashboard trend:", error);
        setTrendData([]);
        setTrendError("Unable to load interface stats.");
      } finally {
        setTrendLoading(false);
      }
    };

    loadDashboardTrend();
  }, [isQueueDashboard, serviceName, trustId, trustName]);

  if (!dashboardData) return <p>Loading data...</p>;

  const { lastEmail } = dashboardData;
  const status = getHealthStatus(trendData);
  const chartTitle = isQueueDashboard
    ? `Pending Count (${formatGroupLabel(DEFAULT_GROUP_BY)})`
    : `Time Delay (${formatGroupLabel(DEFAULT_GROUP_BY)})`;
  const shouldShowEveryTimeTick = isTimeBasedGroup(DEFAULT_GROUP_BY);

  return (
    <div className="content">
      <h2>
        {displayName ? `Dashboard - ${displayName}` : "Interface Dashboard"}
      </h2>

      {/* Status Cards */}
      <div className="status-cards">
        <div className={`status-card ${status.toLowerCase()}`}>
          <h3>Status</h3>
          <p>{status}</p>
        </div>

        <div className="status-card">
          <h3>Last Email</h3>
          <p>{lastEmail?.sent ? `Sent: ${lastEmail.time}` : "Not Sent"}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="chart-section">
        <div className="chart-card dashboard-trend-card">
          <h3>{chartTitle}</h3>
          {trendLoading ? (
            <p className="dashboard-trend-status">Loading trend data...</p>
          ) : trendError ? (
            <p className="dashboard-trend-status error">{trendError}</p>
          ) : trendData.length ? (
            <ResponsiveContainer width="100%" height={360}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  interval={shouldShowEveryTimeTick ? 0 : "preserveStartEnd"}
                  angle={shouldShowEveryTimeTick ? -35 : 0}
                  textAnchor={shouldShowEveryTimeTick ? "end" : "middle"}
                  height={shouldShowEveryTimeTick ? 72 : 30}
                  minTickGap={shouldShowEveryTimeTick ? 0 : 24}
                />
                <YAxis allowDecimals={false} />
                <Tooltip
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload?.tooltipLabel || ""
                  }
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  name={isQueueDashboard ? "Pending count" : "Time delay"}
                  stroke="#2B81BF"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="dashboard-trend-status">
              No trend data available.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
