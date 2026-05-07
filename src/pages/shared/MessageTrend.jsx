import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getServiceGraphData } from "../../api/messageTrendService";
import "./MessageTrend.css";

const GROUP_OPTIONS = ["HOURLY", "DAILY", "MONTHLY"];
const DELAY_OPTIONS = [
  { label: "Avg", value: "averageTimeDelay" },
  { label: "Min", value: "minTimeDelay" },
  { label: "Max", value: "maxTimeDelay" },
];

const toDateInputValue = (date) => {
  const pad = (part) => String(part).padStart(2, "0");

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-");
};

const getDateRangeForGroup = (groupBy) => {
  const to = new Date();
  const from = new Date(to);

  if (groupBy === "HOURLY") {
    from.setDate(from.getDate() - 1);
  } else if (groupBy === "MONTHLY") {
    from.setMonth(from.getMonth() - 12);
  } else {
    from.setDate(from.getDate() - 60);
  }

  return {
    fromDate: toDateInputValue(from),
    toDate: toDateInputValue(to),
  };
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
    data?.metrics ??
    data;

  return Array.isArray(list) ? list : [];
};

const getNumber = (value) => Number(value) || 0;

const formatChartLabel = (label, groupBy) => {
  if (!label) {
    return "";
  }

  const normalizedLabel = String(label).replace(" ", "T");
  const date = new Date(normalizedLabel);

  if (Number.isNaN(date.getTime())) {
    return String(label);
  }

  if (groupBy === "HOURLY") {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
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

export default function MessageTrend() {
  const location = useLocation();
  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );
  const routeState = location.state || {};

  const routeServiceName =
    routeState.serviceName ||
    searchParams.get("serviceName") ||
    routeState.interfaceName ||
    searchParams.get("interfaceName") ||
    "";
  const routeTrustId = routeState.trustId || searchParams.get("trustId") || "";
  const routeTrustName =
    routeState.trustName || searchParams.get("trustName") || "";
  const defaultDates = useMemo(() => getDateRangeForGroup("DAILY"), []);

  const [serviceName, setServiceName] = useState(routeServiceName);
  const [trustId, setTrustId] = useState(routeTrustId);
  const [trustName, setTrustName] = useState(routeTrustName);
  const [groupBy, setGroupBy] = useState("DAILY");
  const [delayMetric, setDelayMetric] = useState("averageTimeDelay");
  const [fromDate, setFromDate] = useState(defaultDates.fromDate);
  const [toDate, setToDate] = useState(defaultDates.toDate);
  const [activeMetric, setActiveMetric] = useState("averageTimeDelay");
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGroupByChange = (nextGroupBy) => {
    const nextDates = getDateRangeForGroup(nextGroupBy);

    setGroupBy(nextGroupBy);
    setFromDate(nextDates.fromDate);
    setToDate(nextDates.toDate);
  };

  const loadTrendData = async ({
    nextServiceName,
    nextTrustId,
    nextTrustName,
    nextGroupBy,
    nextFromDate,
    nextToDate,
    nextDelayMetric,
  }) => {
    if (
      !nextServiceName ||
      !nextTrustId ||
      !nextGroupBy ||
      !nextFromDate ||
      !nextToDate
    ) {
      setChartData([]);
      setError("Unable to load message trend data.");
      console.warn("[MessageTrend] Missing service graph params:", {
        serviceName: nextServiceName,
        trustId: nextTrustId,
        groupBy: nextGroupBy,
        fromDate: nextFromDate,
        toDate: nextToDate,
      });
      return;
    }

    const params = {
      serviceName: nextServiceName,
      trustId: nextTrustId,
      groupBy: nextGroupBy,
      fromDate: nextFromDate,
      toDate: nextToDate,
    };

    try {
      setLoading(true);
      setError("");
      console.log("[MessageTrend] Service graph params:", {
        ...params,
        trustName: nextTrustName,
        metric: nextDelayMetric,
      });

      const response = await getServiceGraphData(params);
      const rows = getGraphRows(response).map((item) => ({
        label: formatChartLabel(item?.label, nextGroupBy),
        value: getNumber(item?.[nextDelayMetric]),
      }));

      setActiveMetric(nextDelayMetric);
      setChartData(rows);
    } catch (loadError) {
      console.error("Error loading message trend:", loadError);
      setChartData([]);
      setError("Unable to load message trend data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const defaultGroupBy = "DAILY";
    const nextDefaultDates = getDateRangeForGroup(defaultGroupBy);
    const defaultMetric = "averageTimeDelay";

    setServiceName(routeServiceName);
    setTrustId(routeTrustId);
    setTrustName(routeTrustName);
    setGroupBy(defaultGroupBy);
    setDelayMetric(defaultMetric);
    setFromDate(nextDefaultDates.fromDate);
    setToDate(nextDefaultDates.toDate);
    setActiveMetric(defaultMetric);
    setError("");

    loadTrendData({
      nextServiceName: routeServiceName,
      nextTrustId: routeTrustId,
      nextTrustName: routeTrustName,
      nextGroupBy: defaultGroupBy,
      nextFromDate: nextDefaultDates.fromDate,
      nextToDate: nextDefaultDates.toDate,
      nextDelayMetric: defaultMetric,
    });
  }, [routeServiceName, routeTrustId, routeTrustName]);

  const handleSearch = async () => {
    loadTrendData({
      nextServiceName: serviceName,
      nextTrustId: trustId,
      nextTrustName: trustName,
      nextGroupBy: groupBy,
      nextFromDate: fromDate,
      nextToDate: toDate,
      nextDelayMetric: delayMetric,
    });
  };

  const selectedMetricLabel =
    DELAY_OPTIONS.find((option) => option.value === activeMetric)?.label || "Avg";

  return (
    <div className="content message-trend-page">
      <h2>Message Trend</h2>

      <div className="message-trend-controls">
        <label>
          Group By:
          <select value={groupBy} onChange={(e) => handleGroupByChange(e.target.value)}>
            {GROUP_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option[0] + option.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </label>

        <label>
          Metric:
          <select value={delayMetric} onChange={(e) => setDelayMetric(e.target.value)}>
            {DELAY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          From Date:
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </label>

        <label>
          To Date:
          <input
            type="date"
            value={toDate}
            min={fromDate || undefined}
            onChange={(e) => setToDate(e.target.value)}
          />
        </label>

        <button
          type="button"
          className="search-btn"
          onClick={handleSearch}
          disabled={loading}
        >
          Search
        </button>
      </div>

      <div className="message-trend-card">
        <h3>{selectedMetricLabel} Time Delay</h3>

        {loading ? (
          <p className="message-trend-status">Loading trend data...</p>
        ) : error ? (
          <p className="message-trend-status error">{error}</p>
        ) : chartData.length ? (
          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="value"
                name={`${selectedMetricLabel} time delay`}
                stroke="#2B81BF"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="message-trend-status">No trend data available.</p>
        )}
      </div>
    </div>
  );
}
