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
import { getServiceGraphData } from "../../api/messageTrendService";
import "./Dashboard.css";

const toDateInputValue = (date) => {
  const pad = (part) => String(part).padStart(2, "0");

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-");
};

const getDailyDateRange = () => {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 60);

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

const formatDailyLabel = (label) => {
  if (!label) {
    return "";
  }

  const date = new Date(String(label).replace(" ", "T"));

  if (Number.isNaN(date.getTime())) {
    return String(label);
  }

  return date.toLocaleDateString([], {
    month: "short",
    day: "2-digit",
  });
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
  } = location.state || {};
  const queueName = stateQueueName || searchParams.get("queueName");
  const aliasName = stateAliasName || searchParams.get("aliasName");
  const serviceName =
    stateServiceName ||
    searchParams.get("serviceName") ||
    stateInterfaceName ||
    searchParams.get("interfaceName") ||
    "";
  const trustId = stateTrustId || searchParams.get("trustId") || "";
  const trustName = stateTrustName || searchParams.get("trustName") || "";
  const displayName =
    aliasName && queueName ? `${aliasName} (${queueName})` : aliasName || id;
  const [dashboardData, setDashboardData] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendError, setTrendError] = useState("");

  const mockDashboardData = {
    status: "Healthy",

    lastEmail: {
      sent: true,
      time: "Dec 23, 2025 10:42 AM",
    },
  };

  useEffect(() => {
    // simulate API delay
    const timer = setTimeout(() => {
      setDashboardData(mockDashboardData);
    }, 500);

    return () => clearTimeout(timer);
  }, [id]);

  useEffect(() => {
    const loadDashboardTrend = async () => {
      if (!serviceName || !trustId) {
        setTrendData([]);
        setTrendError("");
        console.warn("[Dashboard] Missing service graph params:", {
          serviceName,
          trustId,
        });
        return;
      }

      const { fromDate, toDate } = getDailyDateRange();
      const params = {
        serviceName,
        trustId,
        groupBy: "DAILY",
        fromDate,
        toDate,
      };

      try {
        setTrendLoading(true);
        setTrendError("");
        console.log("[Dashboard] Service graph params:", {
          ...params,
          trustName,
          metric: "averageTimeDelay",
        });

        const response = await getServiceGraphData(params);
        const rows = getGraphRows(response).map((item) => ({
          label: formatDailyLabel(item?.label),
          value: getNumber(item?.averageTimeDelay),
        }));

        setTrendData(rows);
      } catch (error) {
        console.error("Error loading dashboard trend:", error);
        setTrendData([]);
        setTrendError("Unable to load message trend data.");
      } finally {
        setTrendLoading(false);
      }
    };

    loadDashboardTrend();
  }, [serviceName, trustId, trustName]);

  if (!dashboardData) return <p>Loading data...</p>;

  const {
    lastEmail,
    status,
  } = dashboardData;

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
          <h3>Avg Time Delay Trend</h3>
          {trendLoading ? (
            <p className="dashboard-trend-status">Loading trend data...</p>
          ) : trendError ? (
            <p className="dashboard-trend-status error">{trendError}</p>
          ) : trendData.length ? (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  minTickGap={24}
                  interval="preserveStartEnd"
                  tick={{ fontSize: 12 }}
                />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="value"
                  name="Avg time delay"
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


