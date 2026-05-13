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
import {
  getCriticalInboundReceivers,
  getCriticalInterfaces,
} from "../../api/criticalInterfacesService";
import {
  QUEUE_TREND_METRIC,
  SERVICE_TREND_METRIC,
  getQueueGraphData,
  getServiceGraphData,
  toApiDateTime,
} from "../../api/messageTrendService";
import { getTrusts } from "../../api/trustService";
import { filterTrustsByAccess } from "../../utils/trustAccess";
import "./MessageTrend.css";

const INTERFACE_TYPES = {
  INBOUND: "INBOUND",
  OUTBOUND: "OUTBOUND",
};
const GROUP_OPTIONS = [
  "DAILY",
  "FIVE_MINUTES",
  "HOURLY",
  "MONTHLY",
  "THIRTY_MINUTES",
];
const TIME_OPTIONS = [
  { label: "Last 6 hours", value: 6 },
  { label: "Last 12 hours", value: 12 },
  { label: "Last 24 hours", value: 24 },
];

const formatGroupLabel = (value) =>
  String(value)
    .split("_")
    .map((part) => part[0] + part.slice(1).toLowerCase())
    .join(" ");

const toDateTimeInputValue = (date) => {
  const pad = (part) => String(part).padStart(2, "0");

  const datePart = [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-");
  const timePart = [
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join(":");

  return `${datePart}T${timePart}`;
};

const getDateRangeForHours = (hours) => {
  const to = new Date();
  const from = new Date(to);
  from.setHours(from.getHours() - Number(hours || 24));

  return {
    fromDateTime: toDateTimeInputValue(from),
    toDateTime: toDateTimeInputValue(to),
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
    data?.queueGraphData ??
    data?.metrics ??
    data;

  return Array.isArray(list) ? list : [];
};

const getListFromApiResponse = (response) => {
  const data = unwrapApiData(response);
  const list =
    data?.data ??
    data?.content ??
    data?.items ??
    data?.criticalInterfaces ??
    data?.criticalInterfaceList ??
    data?.criticalInboundReceivers ??
    data?.criticalInboundReceiverList ??
    data;

  return Array.isArray(list) ? list : [];
};

const makeInterfaceKey = (type, name) => `${type}::${name}`;

const parseInterfaceKey = (key) => {
  const [type, ...nameParts] = String(key || "").split("::");

  return {
    type: type || "",
    name: nameParts.join("::"),
  };
};

const getInterfaceTypeLabel = (type) =>
  type === INTERFACE_TYPES.OUTBOUND ? "Outbound" : "Inbound";

const getInterfaceName = (item, interfaceType) => {
  if (interfaceType === INTERFACE_TYPES.INBOUND) {
    return (
      item?.serviceName ??
      item?.interfaceName ??
      item?.interface_name ??
      item?.inboundName ??
      item?.name ??
      ""
    );
  }

  return (
    item?.endpointName ??
    item?.queueName ??
    item?.interfaceName ??
    item?.interface_name ??
    item?.serviceName ??
    item?.name ??
    ""
  );
};

const extractInterfaceOptions = (items, interfaceType) => {
  const names = items
    .map((item) => getInterfaceName(item, interfaceType))
    .map((name) => (typeof name === "string" ? name.trim() : ""))
    .filter(Boolean);

  return Array.from(new Set(names))
    .map((name) => ({
      name,
      type: interfaceType,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

const getNumber = (value) => Number(value) || 0;

const getQueueValue = (item) =>
  getNumber(item?.[QUEUE_TREND_METRIC]);

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

const formatChartLabel = (label, groupBy) => {
  if (!label) {
    return "";
  }

  const normalizedLabel = String(label).replace(" ", "T");
  const date = new Date(normalizedLabel);

  if (Number.isNaN(date.getTime())) {
    return String(label);
  }

  if (
    groupBy === "FIVE_MINUTES" ||
    groupBy === "THIRTY_MINUTES" ||
    groupBy === "HOURLY"
  ) {
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

export default function MessageTrend({ userProfile = null }) {
  const location = useLocation();
  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );
  const routeState = location.state || {};

  const routeServiceName =
    routeState.serviceName ||
    searchParams.get("serviceName") ||
    routeState.queueName ||
    searchParams.get("queueName") ||
    routeState.interfaceName ||
    searchParams.get("interfaceName") ||
    "";
  const routeDirection =
    routeState.direction || searchParams.get("direction") || "";
  const routeInterfaceType =
    String(routeDirection).toUpperCase() === "OUTBOUND" ||
    routeState.queueName ||
    searchParams.get("queueName")
      ? INTERFACE_TYPES.OUTBOUND
      : INTERFACE_TYPES.INBOUND;
  const routeTrustId = routeState.trustId || searchParams.get("trustId") || "";
  const routeTrustName =
    routeState.trustName || searchParams.get("trustName") || "";
  const defaultDates = useMemo(() => getDateRangeForHours(24), []);

  const [serviceName, setServiceName] = useState(routeServiceName);
  const [interfaceType, setInterfaceType] = useState(routeInterfaceType);
  const [trustId, setTrustId] = useState(routeTrustId);
  const [trustName, setTrustName] = useState(routeTrustName);
  const [trustOptions, setTrustOptions] = useState([]);
  const [allInterfaceOptions, setAllInterfaceOptions] = useState(
    routeServiceName
      ? [{ name: routeServiceName, type: routeInterfaceType }]
      : []
  );
  const [interfaceLoading, setInterfaceLoading] = useState(false);
  const [groupBy, setGroupBy] = useState("FIVE_MINUTES");
  const [timeRangeHours, setTimeRangeHours] = useState(24);
  const [fromDateTime, setFromDateTime] = useState(defaultDates.fromDateTime);
  const [toDateTime, setToDateTime] = useState(defaultDates.toDateTime);
  const [activeGroupBy, setActiveGroupBy] = useState("FIVE_MINUTES");
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const interfaceOptions = useMemo(
    () => allInterfaceOptions.filter((option) => option.type === interfaceType),
    [allInterfaceOptions, interfaceType]
  );

  const isOutboundSelected = interfaceType === INTERFACE_TYPES.OUTBOUND;

  const handleTimeRangeChange = (nextTimeRangeHours) => {
    const parsedHours = Number(nextTimeRangeHours);
    const nextDates = getDateRangeForHours(parsedHours);

    setTimeRangeHours(parsedHours);
    setFromDateTime(nextDates.fromDateTime);
    setToDateTime(nextDates.toDateTime);
  };

  const handleTrustChange = (nextTrustId) => {
    const selectedTrust = trustOptions.find(
      (trust) => String(trust.id) === String(nextTrustId)
    );

    setTrustId(nextTrustId);
    setTrustName(selectedTrust?.name || "");
    setServiceName("");
  };

  const handleInterfaceTypeChange = (nextInterfaceType) => {
    setInterfaceType(nextInterfaceType);
    setServiceName("");
  };

  const handleInterfaceChange = (nextInterfaceKey) => {
    const nextInterface = parseInterfaceKey(nextInterfaceKey);

    setInterfaceType(nextInterface.type || INTERFACE_TYPES.INBOUND);
    setServiceName(nextInterface.name);
  };

  const loadTrendData = async ({
    nextServiceName,
    nextTrustId,
    nextInterfaceType,
    nextGroupBy,
    nextFromDateTime,
    nextToDateTime,
  }) => {
    if (
      !nextServiceName ||
      !nextTrustId ||
      !nextGroupBy ||
      !nextFromDateTime ||
      !nextToDateTime
    ) {
      setChartData([]);
      setError("Select a trust and interface to load message trend data.");
      console.warn("[MessageTrend] Missing graph params:", {
        interfaceName: nextServiceName,
        interfaceType: nextInterfaceType,
        trustId: nextTrustId,
        groupBy: nextGroupBy,
        fromDateTime: nextFromDateTime,
        toDateTime: nextToDateTime,
      });
      return;
    }

    const isQueueTrend = nextInterfaceType === INTERFACE_TYPES.OUTBOUND;
    const from = toApiDateTime(nextFromDateTime, "00:00:00");
    const to = toApiDateTime(nextToDateTime, "23:59:59");
    const params = {
      trustId: nextTrustId,
      groupBy: nextGroupBy,
    };

    try {
      setLoading(true);
      setError("");
      const requestParams = isQueueTrend
        ? {
            queueName: nextServiceName,
            ...params,
            fromDateTime: from,
            toDateTime: to,
          }
        : {
            serviceName: nextServiceName,
            ...params,
            from,
            to,
          };

      console.log("[MessageTrend] Graph query params:", requestParams);

      const response = isQueueTrend
        ? await getQueueGraphData(requestParams)
        : await getServiceGraphData(requestParams);
      const rows = getGraphRows(response)
        .filter((item) =>
          isWithinDateTimeRange(item, nextFromDateTime, nextToDateTime)
        )
        .map((item) => ({
          label: formatChartLabel(getGraphLabel(item), nextGroupBy),
          value: isQueueTrend
            ? getQueueValue(item)
            : getNumber(item?.[SERVICE_TREND_METRIC]),
        }));

      setActiveGroupBy(nextGroupBy);
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
    let isActive = true;

    const fetchTrustOptions = async () => {
      try {
        const res = await getTrusts();
        if (!isActive) return;

        const nextTrustOptions = filterTrustsByAccess(
          res.data || [],
          userProfile
        );

        setTrustOptions(nextTrustOptions);
      } catch (fetchError) {
        console.error("Error fetching trusts:", fetchError);
        if (isActive) {
          setTrustOptions([]);
        }
      }
    };

    fetchTrustOptions();

    return () => {
      isActive = false;
    };
  }, [userProfile]);

  useEffect(() => {
    if (!routeTrustId || trustOptions.length === 0) return;

    const selectedTrust = trustOptions.find(
      (trust) => String(trust.id) === String(routeTrustId)
    );

    if (selectedTrust) {
      setTrustName(selectedTrust.name || routeTrustName);
    }
  }, [routeTrustId, routeTrustName, trustOptions]);

  useEffect(() => {
    let isActive = true;

    const loadInterfaceOptions = async () => {
      if (!trustId) {
        setAllInterfaceOptions(
          routeServiceName
            ? [{ name: routeServiceName, type: routeInterfaceType }]
            : []
        );
        setInterfaceLoading(false);
        return;
      }

      try {
        setInterfaceLoading(true);
        const response =
          interfaceType === INTERFACE_TYPES.INBOUND
            ? await getCriticalInboundReceivers({
                trustId,
              })
            : await getCriticalInterfaces({
                trustId,
              });
        if (!isActive) return;

        const fetchedInterfaceOptions = extractInterfaceOptions(
          getListFromApiResponse(response),
          interfaceType
        );
        const routeInterfaceOption =
          String(trustId) === String(routeTrustId) &&
          routeServiceName &&
          interfaceType === routeInterfaceType
            ? [{ name: routeServiceName, type: routeInterfaceType }]
            : [];
        const combinedOptions = Array.from(
          new Map(
            [...fetchedInterfaceOptions, ...routeInterfaceOption].map(
              (option) => [makeInterfaceKey(option.type, option.name), option]
            )
          ).values()
        ).sort(
          (a, b) => a.name.localeCompare(b.name) || a.type.localeCompare(b.type)
        );

        setAllInterfaceOptions(combinedOptions);
      } catch (fetchError) {
        console.error("Error fetching interface names:", fetchError);
        if (isActive) {
          setAllInterfaceOptions(
            routeServiceName
              ? [{ name: routeServiceName, type: routeInterfaceType }]
              : []
          );
        }
      } finally {
        if (isActive) {
          setInterfaceLoading(false);
        }
      }
    };

    loadInterfaceOptions();

    return () => {
      isActive = false;
    };
  }, [
    interfaceType,
    routeInterfaceType,
    routeServiceName,
    routeTrustId,
    trustId,
  ]);

  useEffect(() => {
    if (!serviceName) return;
    if (
      interfaceOptions.some(
        (option) => option.name === serviceName && option.type === interfaceType
      )
    ) {
      return;
    }

    setServiceName("");
  }, [interfaceOptions, interfaceType, serviceName]);

  useEffect(() => {
    const defaultGroupBy = "FIVE_MINUTES";
    const nextDefaultDates = getDateRangeForHours(24);

    setServiceName(routeServiceName);
    setInterfaceType(routeInterfaceType);
    setTrustId(routeTrustId);
    setTrustName(routeTrustName);
    setGroupBy(defaultGroupBy);
    setTimeRangeHours(24);
    setFromDateTime(nextDefaultDates.fromDateTime);
    setToDateTime(nextDefaultDates.toDateTime);
    setActiveGroupBy(defaultGroupBy);
    setError("");
    setAllInterfaceOptions(
      routeServiceName
        ? [{ name: routeServiceName, type: routeInterfaceType }]
        : []
    );

    loadTrendData({
      nextServiceName: routeServiceName,
      nextTrustId: routeTrustId,
      nextInterfaceType: routeInterfaceType,
      nextGroupBy: defaultGroupBy,
      nextFromDateTime: nextDefaultDates.fromDateTime,
      nextToDateTime: nextDefaultDates.toDateTime,
    });
  }, [routeInterfaceType, routeServiceName, routeTrustId, routeTrustName]);

  const handleSearch = async () => {
    loadTrendData({
      nextServiceName: serviceName,
      nextTrustId: trustId,
      nextInterfaceType: interfaceType,
      nextGroupBy: groupBy,
      nextFromDateTime: fromDateTime,
      nextToDateTime: toDateTime,
    });
  };

  const chartTitle = isOutboundSelected
    ? `Max Pending Queue Count (${formatGroupLabel(activeGroupBy)})`
    : `Max Time Delay (${formatGroupLabel(activeGroupBy)})`;

  return (
    <div className="content message-trend-page">
      <h2>Message Trend</h2>

      <div className="message-trend-controls">
        <label className="message-trend-control trust-control">
          Trust:
          <select
            value={trustId}
            onChange={(e) => handleTrustChange(e.target.value)}
          >
            <option value="">Select trust</option>
            {trustOptions.map((trust) => (
              <option key={trust.id} value={trust.id}>
                {trust.name}
              </option>
            ))}
          </select>
        </label>

        <label className="message-trend-control type-control">
          Type:
          <select
            value={interfaceType}
            onChange={(e) => handleInterfaceTypeChange(e.target.value)}
          >
            <option value={INTERFACE_TYPES.INBOUND}>Inbound</option>
            <option value={INTERFACE_TYPES.OUTBOUND}>Outbound</option>
          </select>
        </label>

        <label className="message-trend-control interface-control">
          Interface:
          <select
            value={
              serviceName ? makeInterfaceKey(interfaceType, serviceName) : ""
            }
            onChange={(e) => handleInterfaceChange(e.target.value)}
            disabled={
              !trustId || interfaceLoading || interfaceOptions.length === 0
            }
          >
            <option value="">
              {!trustId
                ? "Select trust first"
                : interfaceLoading
                  ? "Loading interfaces..."
                  : `Select ${getInterfaceTypeLabel(interfaceType).toLowerCase()}`}
            </option>
            {interfaceOptions.map((option) => (
              <option
                key={makeInterfaceKey(option.type, option.name)}
                value={makeInterfaceKey(option.type, option.name)}
              >
                {option.name}
              </option>
            ))}
          </select>
        </label>

        <label className="message-trend-control group-control">
          Group By:
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
          >
            {GROUP_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {formatGroupLabel(option)}
              </option>
            ))}
          </select>
        </label>

        <label className="message-trend-control time-control">
          Time:
          <select
            value={timeRangeHours}
            onChange={(e) => handleTimeRangeChange(e.target.value)}
          >
            {TIME_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="message-trend-control datetime-control">
          From Date Time:
          <input
            type="datetime-local"
            step="1"
            value={fromDateTime}
            onChange={(e) => setFromDateTime(e.target.value)}
          />
        </label>

        <label className="message-trend-control datetime-control">
          To Date Time:
          <input
            type="datetime-local"
            step="1"
            value={toDateTime}
            min={fromDateTime || undefined}
            onChange={(e) => setToDateTime(e.target.value)}
          />
        </label>

        <button
          type="button"
          className="search-btn message-trend-search"
          onClick={handleSearch}
          disabled={loading || !trustId || !serviceName}
        >
          Search
        </button>
      </div>

      <div className="message-trend-card">
        <h3>{chartTitle}</h3>

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
                name={
                  isOutboundSelected
                    ? "Max pending queue count"
                    : "Max time delay"
                }
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
