import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import {
  QUEUE_TREND_METRIC,
  SERVICE_TREND_METRIC,
  getQueueGraphData,
  getServiceGraphData,
  toApiDateTime,
} from "../../api/InterfaceStatsService";
import {
  getCriticalInboundReceivers,
  getCriticalInterfaces,
} from "../../api/criticalInterfacesService";
import { getTrusts } from "../../api/trustService";
import { filterTrustsByAccess } from "../../utils/trustAccess";
import optimonLogo from "../../assets/optimon_logo.png";
import "./InterfaceStats.css";

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
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const padDatePart = (part) => String(part).padStart(2, "0");

const formatGroupLabel = (value) =>
  String(value)
    .split("_")
    .map((part) => part[0] + part.slice(1).toLowerCase())
    .join(" ");

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
  from.setHours(from.getHours() - Number(hours || 24));

  return {
    fromDateTime: toDateTimeInputValue(from),
    toDateTime: toDateTimeInputValue(to),
  };
};

const getDateInputPart = (dateTimeValue) =>
  String(dateTimeValue || "").split("T")[0] || "";

const getTimeInputPart = (dateTimeValue) =>
  String(dateTimeValue || "").split("T")[1] || "00:00:00";

const mergeTimeInputPart = (dateTimeValue, nextTime) => {
  const datePart = getDateInputPart(dateTimeValue);

  return datePart ? `${datePart}T${nextTime || "00:00:00"}` : "";
};

const clampNumber = (value, min, max) => {
  const parsedValue = Number(value);

  if (Number.isNaN(parsedValue)) {
    return min;
  }

  return Math.min(max, Math.max(min, parsedValue));
};

const getTimeParts = (timeValue) => {
  const [hours = "00", minutes = "00", seconds = "00"] = String(
    timeValue || "00:00:00"
  ).split(":");

  return {
    hours: clampNumber(hours, 0, 23),
    minutes: clampNumber(minutes, 0, 59),
    seconds: clampNumber(seconds, 0, 59),
  };
};

const makeTimeInputValue = ({ hours, minutes, seconds }) =>
  [hours, minutes, seconds].map((part) => padDatePart(part)).join(":");

const toDateInputValue = (date) =>
  [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
  ].join("-");

const parseDateInputValue = (dateValue) => {
  const [year, month, day] = String(dateValue || "")
    .split("-")
    .map(Number);

  if (!year || !month || !day) {
    return null;
  }

  const parsedDate = new Date(year, month - 1, day);

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const formatDateTimeDisplay = (dateTimeValue) => {
  const parsedDate = new Date(dateTimeValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return parsedDate.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
};

function TimeStepper({ value, min, onChange }) {
  const timeParts = getTimeParts(value);
  const minParts = min ? getTimeParts(min) : null;

  const updateTimePart = (partName, nextValue) => {
    const nextParts = {
      ...timeParts,
      [partName]: clampNumber(nextValue, partName === "hours" ? 0 : 0, partName === "hours" ? 23 : 59),
    };
    const nextTime = makeTimeInputValue(nextParts);

    if (min && nextTime < min) {
      onChange(min);
      return;
    }

    onChange(nextTime);
  };

  const fields = [
    {
      key: "hours",
      label: "HH",
      max: 23,
      min: minParts ? minParts.hours : 0,
      value: timeParts.hours,
    },
    {
      key: "minutes",
      label: "MM",
      max: 59,
      min: minParts && timeParts.hours === minParts.hours ? minParts.minutes : 0,
      value: timeParts.minutes,
    },
    {
      key: "seconds",
      label: "SS",
      max: 59,
      min:
        minParts &&
        timeParts.hours === minParts.hours &&
        timeParts.minutes === minParts.minutes
          ? minParts.seconds
          : 0,
      value: timeParts.seconds,
    },
  ];

  return (
    <div className="time-stepper" aria-label="Select time">
      {fields.map((field, index) => (
        <Fragment key={field.key}>
          <label className="time-stepper-part">
            <span>{field.label}</span>
            <input
              type="number"
              min={field.min}
              max={field.max}
              step="1"
              value={padDatePart(field.value)}
              onChange={(e) => updateTimePart(field.key, e.target.value)}
              onBlur={(e) => updateTimePart(field.key, e.target.value)}
              aria-label={field.label}
            />
          </label>
          {index < fields.length - 1 && (
            <span className="time-stepper-separator" aria-hidden="true">
              :
            </span>
          )}
        </Fragment>
      ))}
    </div>
  );
}

function DateTimePicker({
  label,
  value,
  minValue = "",
  defaultTimeOnDateSelect = "00:00:00",
  onChange,
}) {
  const selectedDate = parseDateInputValue(getDateInputPart(value)) || new Date();
  const minDate = parseDateInputValue(getDateInputPart(minValue));
  const pickerRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(selectedDate);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (pickerRef.current?.contains(event.target)) {
        return;
      }

      setIsOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [isOpen]);

  const handleTriggerClick = () => {
    if (!isOpen) {
      setViewDate(selectedDate);
    }

    setIsOpen((nextOpen) => !nextOpen);
  };

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const selectedDatePart = getDateInputPart(value);
  const minDatePart = getDateInputPart(minValue);
  const minTime =
    selectedDatePart && selectedDatePart === minDatePart
      ? getTimeInputPart(minValue)
      : undefined;
  const calendarCells = [
    ...Array.from({ length: firstDay }, (_, index) => ({
      key: `blank-${index}`,
      day: null,
    })),
    ...Array.from({ length: daysInMonth }, (_, index) => ({
      key: `day-${index + 1}`,
      day: index + 1,
    })),
  ];

  const handleMonthChange = (offset) => {
    setViewDate(new Date(viewYear, viewMonth + offset, 1));
  };

  const handleYearChange = (nextYear) => {
    const parsedYear = Number(nextYear);

    if (!parsedYear) {
      return;
    }

    setViewDate(new Date(parsedYear, viewMonth, 1));
  };

  const handleDateSelect = (day) => {
    const nextDate = toDateInputValue(new Date(viewYear, viewMonth, day));

    if (minDate && nextDate < toDateInputValue(minDate)) {
      return;
    }

    onChange(`${nextDate}T${defaultTimeOnDateSelect}`);
  };

  return (
    <div className="datetime-picker" ref={pickerRef}>
      <button
        type="button"
        className="datetime-picker-trigger"
        onClick={handleTriggerClick}
      >
        <span>{formatDateTimeDisplay(value) || "Select date and time"}</span>
        <i className="ri-calendar-line" aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="datetime-popover" role="dialog" aria-label={label}>
          <div className="datetime-calendar-header">
            <button
              type="button"
              className="datetime-calendar-nav"
              onClick={() => handleMonthChange(-1)}
              aria-label="Previous month"
            >
              <i className="ri-arrow-left-s-line" aria-hidden="true" />
            </button>
            <div className="datetime-calendar-title">
              <strong>
                {viewDate.toLocaleDateString([], {
                  month: "long",
                })}
              </strong>
              <input
                type="number"
                min="1900"
                max="2100"
                step="1"
                value={viewYear}
                onChange={(e) => handleYearChange(e.target.value)}
                aria-label="Calendar year"
              />
            </div>
            <button
              type="button"
              className="datetime-calendar-nav"
              onClick={() => handleMonthChange(1)}
              aria-label="Next month"
            >
              <i className="ri-arrow-right-s-line" aria-hidden="true" />
            </button>
          </div>

          <div className="datetime-calendar-grid">
            {WEEKDAY_LABELS.map((weekday) => (
              <span key={weekday} className="datetime-calendar-weekday">
                {weekday}
              </span>
            ))}
            {calendarCells.map((cell) =>
              cell.day ? (
                <button
                  type="button"
                  key={cell.key}
                  className={`datetime-calendar-day ${
                    selectedDatePart ===
                    toDateInputValue(new Date(viewYear, viewMonth, cell.day))
                      ? "selected"
                      : ""
                  }`}
                  onClick={() => handleDateSelect(cell.day)}
                  disabled={
                    minDate &&
                    toDateInputValue(new Date(viewYear, viewMonth, cell.day)) <
                      toDateInputValue(minDate)
                  }
                >
                  {cell.day}
                </button>
              ) : (
                <span key={cell.key} className="datetime-calendar-empty" />
              )
            )}
          </div>

          <label className="datetime-popover-time">
            Select Time
            <TimeStepper
              value={getTimeInputPart(value)}
              min={minTime}
              onChange={(nextTime) => onChange(mergeTimeInputPart(value, nextTime))}
            />
          </label>

          <button
            type="button"
            className="datetime-popover-done"
            onClick={() => setIsOpen(false)}
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}

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

const getInterfaceAliasName = (item) =>
  item?.aliasName ?? item?.alias_name ?? item?.alias ?? "";

const extractInterfaceOptions = (items, interfaceType) => {
  const optionsByKey = new Map();

  items.forEach((item) => {
    const name = String(getInterfaceName(item, interfaceType) || "").trim();

    if (!name) {
      return;
    }

    const aliasName = String(getInterfaceAliasName(item) || "").trim();
    const option = {
      name,
      aliasName,
      displayName: aliasName || name,
      type: interfaceType,
    };

    optionsByKey.set(makeInterfaceKey(interfaceType, name), option);
  });

  return Array.from(optionsByKey.values()).sort((a, b) =>
    a.displayName.localeCompare(b.displayName, undefined, {
      sensitivity: "base",
    })
  );
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

const formatPdfNumber = (value) =>
  Number(value).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });

const getHighestChartPoint = (chartData) =>
  chartData.reduce(
    (maxPoint, item) =>
      Number(item.value || 0) > Number(maxPoint?.value || 0)
        ? item
        : maxPoint,
    chartData[0] || null
  );

function PdfPointLabel({ x, y, value }) {
  if (x === undefined || y === undefined || value === undefined) {
    return null;
  }

  return (
    <text
      x={x}
      y={y - 8}
      className="interface-stats-pdf-point-label"
      textAnchor="middle"
    >
      {formatPdfNumber(value)}
    </text>
  );
}

const downloadBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const makeSafeFileNamePart = (value) =>
  String(value || "interface-stats")
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "interface-stats";

function PdfExportReport({
  chartData,
  chartTitle,
  fullMetricLabel,
  fromDateTime,
  groupByLabel,
  interfaceAliasLabel,
  interfaceLabel,
  interfaceTypeLabel,
  metricUnitLabel,
  toDateTime,
  trustLabel,
  yAxisLabel,
}) {
  const highestPoint = getHighestChartPoint(chartData);

  return (
    <div className="interface-stats-pdf-report">
      <header className="interface-stats-pdf-header">
        <div>
          <h1>Interface Stats</h1>
          <p>{chartTitle}</p>
        </div>
        <img src={optimonLogo} alt="Optimon" />
      </header>

      <section className="interface-stats-pdf-meta">
        <div className="interface-stats-pdf-meta-item trust-name">
          <span>Trust Name:</span>
          <strong>{trustLabel || "N/A"}</strong>
        </div>
        <div className="interface-stats-pdf-meta-item interface-type">
          <span>Type:</span>
          <strong>{interfaceTypeLabel || "N/A"}</strong>
        </div>
        <div className="interface-stats-pdf-meta-item alias-name">
          <span>Alias Name:</span>
          <strong>{interfaceAliasLabel || "N/A"}</strong>
        </div>
        <div className="interface-stats-pdf-meta-item interface-name">
          <span>Interface Name:</span>
          <strong>{interfaceLabel || "N/A"}</strong>
        </div>
        <div className="interface-stats-pdf-meta-item group-by">
          <span>Group By:</span>
          <strong>{groupByLabel || "N/A"}</strong>
        </div>
        <div className="interface-stats-pdf-meta-item x-axis">
          <span>X-Axis:</span>
          <strong>Date / Time</strong>
        </div>
        <div className="interface-stats-pdf-meta-item from-date">
          <span>From:</span>
          <strong>{formatDateTimeDisplay(fromDateTime) || "N/A"}</strong>
        </div>
        <div className="interface-stats-pdf-meta-item to-date">
          <span>To:</span>
          <strong>{formatDateTimeDisplay(toDateTime) || "N/A"}</strong>
        </div>
        <div className="interface-stats-pdf-meta-item y-axis">
          <span>Y-Axis:</span>
          <strong>{yAxisLabel || "N/A"}</strong>
        </div>
      </section>

      {metricUnitLabel && (
        <div className="interface-stats-pdf-metric-unit">
          {metricUnitLabel}
        </div>
      )}

      {highestPoint && (
        <section className="interface-stats-pdf-highlight">
          <span>Highest {fullMetricLabel}</span>
          <strong>{formatPdfNumber(highestPoint.value)}</strong>
          {highestPoint.tooltipLabel && <em>{highestPoint.tooltipLabel}</em>}
        </section>
      )}

      <section className="interface-stats-pdf-chart">
        <ResponsiveContainer width="100%" height={330}>
          <LineChart data={chartData} margin={{ top: 34, right: 26, bottom: 36, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              interval={0}
              angle={-28}
              textAnchor="end"
              height={66}
              tick={{ fontSize: 10 }}
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="value"
              name={fullMetricLabel}
              stroke="#2B81BF"
              strokeWidth={2}
              dot={{ r: 3 }}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="value"
                content={(props) => <PdfPointLabel {...props} />}
              />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </section>

      <footer>Generated from Optimon Monitoring Dashboard</footer>
    </div>
  );
}

export default function InterfaceStats({ userProfile = null }) {
  const location = useLocation();
  const pdfReportRef = useRef(null);
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
  const routeAliasName =
    routeState.aliasName || searchParams.get("aliasName") || "";
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
      ? [
          {
            name: routeServiceName,
            aliasName: routeAliasName,
            displayName: routeAliasName || routeServiceName,
            type: routeInterfaceType,
          },
        ]
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
      setError("Select a trust and interface to load interface stats.");
      console.warn("[InterfaceStats] Missing graph params:", {
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

      console.log("[InterfaceStats] Graph query params:", requestParams);

      const response = isQueueTrend
        ? await getQueueGraphData(requestParams)
        : await getServiceGraphData(requestParams);
      const rows = getGraphRows(response)
        .filter((item) =>
          isWithinDateTimeRange(item, nextFromDateTime, nextToDateTime)
        )
        .map((item) => {
          const graphLabel = getGraphLabel(item);

          return {
            label: formatChartAxisLabel(graphLabel, nextGroupBy),
            tooltipLabel: formatChartTooltipLabel(graphLabel, nextGroupBy),
            value: isQueueTrend
              ? getQueueValue(item)
              : getNumber(item?.[SERVICE_TREND_METRIC]),
          };
        });

      setActiveGroupBy(nextGroupBy);
      setChartData(rows);
    } catch (loadError) {
      console.error("Error loading interface stats:", loadError);
      setChartData([]);
      setError("Unable to load interface stats data.");
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
            ? [
                {
                  name: routeServiceName,
                  aliasName: routeAliasName,
                  displayName: routeAliasName || routeServiceName,
                  type: routeInterfaceType,
                },
              ]
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
            ? [
                {
                  name: routeServiceName,
                  aliasName: routeAliasName,
                  displayName: routeAliasName || routeServiceName,
                  type: routeInterfaceType,
                },
              ]
            : [];
        const combinedOptions = Array.from(
          new Map(
            [...routeInterfaceOption, ...fetchedInterfaceOptions].map(
              (option) => [makeInterfaceKey(option.type, option.name), option]
            )
          ).values()
        ).sort(
          (a, b) =>
            a.displayName.localeCompare(b.displayName, undefined, {
              sensitivity: "base",
            }) || a.type.localeCompare(b.type)
        );

        setAllInterfaceOptions(combinedOptions);
      } catch (fetchError) {
        console.error("Error fetching interface names:", fetchError);
        if (isActive) {
          setAllInterfaceOptions(
            routeServiceName
              ? [
                  {
                    name: routeServiceName,
                    aliasName: routeAliasName,
                    displayName: routeAliasName || routeServiceName,
                    type: routeInterfaceType,
                  },
                ]
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
    routeAliasName,
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
        ? [
            {
              name: routeServiceName,
              aliasName: routeAliasName,
              displayName: routeAliasName || routeServiceName,
              type: routeInterfaceType,
            },
          ]
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
  }, [
    routeAliasName,
    routeInterfaceType,
    routeServiceName,
    routeTrustId,
    routeTrustName,
  ]);

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
    ? `Pending Count (${formatGroupLabel(activeGroupBy)})`
    : `Time Delay (${formatGroupLabel(activeGroupBy)})`;
  const fullMetricLabel = isOutboundSelected ? "Pending count" : "Idle time";
  const groupByLabel = formatGroupLabel(activeGroupBy);
  const selectedInterfaceOption = interfaceOptions.find(
    (option) => option.name === serviceName && option.type === interfaceType
  );
  const interfaceAliasLabel =
    selectedInterfaceOption?.aliasName ||
    (serviceName === routeServiceName ? routeAliasName : "");
  const metricUnitLabel = isOutboundSelected ? "" : "Idle Time (in mins)";
  const yAxisLabel = isOutboundSelected ? "Pending Count" : "Time Delay";
  const shouldShowEveryTimeTick = isTimeBasedGroup(activeGroupBy);
  const handleDownloadPdf = async () => {
    const reportElement = pdfReportRef.current;

    if (!chartData.length || !reportElement) {
      return;
    }

    await new Promise((resolve) => requestAnimationFrame(resolve));

    const canvas = await html2canvas(reportElement, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
    });
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "letter",
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const pagePadding = 24;
    const maxImageWidth = pageWidth - pagePadding * 2;
    const maxImageHeight = pageHeight - pagePadding * 2;
    const widthRatio = maxImageWidth / canvas.width;
    const heightRatio = maxImageHeight / canvas.height;
    const ratio = Math.min(widthRatio, heightRatio);
    const imageWidth = canvas.width * ratio;
    const imageHeight = canvas.height * ratio;
    const imageX = (pageWidth - imageWidth) / 2;
    const imageY = (pageHeight - imageHeight) / 2;

    doc.addImage(
      canvas.toDataURL("image/png"),
      "PNG",
      imageX,
      imageY,
      imageWidth,
      imageHeight
    );

    downloadBlob(
      doc.output("blob"),
      `${makeSafeFileNamePart(serviceName)}-${makeSafeFileNamePart(chartTitle)}.pdf`
    );
  };

  return (
    <div className="content interface-stats-page">
      <h2>Interface Stats</h2>

      <div className="interface-stats-controls">
        <label className="interface-stats-control trust-control">
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

        <label className="interface-stats-control type-control">
          Type:
          <select
            value={interfaceType}
            onChange={(e) => handleInterfaceTypeChange(e.target.value)}
          >
            <option value={INTERFACE_TYPES.INBOUND}>Inbound</option>
            <option value={INTERFACE_TYPES.OUTBOUND}>Outbound</option>
          </select>
        </label>

        <label className="interface-stats-control interface-control">
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
                {option.displayName || option.name}
              </option>
            ))}
          </select>
        </label>

        <label className="interface-stats-control group-control">
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

        <label className="interface-stats-control time-control">
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

        <div className="interface-stats-control datetime-control">
          <span>From Date Time:</span>
          <DateTimePicker
            label="From date and time"
            value={fromDateTime}
            defaultTimeOnDateSelect="00:00:00"
            onChange={setFromDateTime}
          />
        </div>

        <div className="interface-stats-control datetime-control">
          <span>To Date Time:</span>
          <DateTimePicker
            label="To date and time"
            value={toDateTime}
            minValue={fromDateTime}
            defaultTimeOnDateSelect="23:59:59"
            onChange={setToDateTime}
          />
        </div>

        <button
          type="button"
          className="search-btn interface-stats-search"
          onClick={handleSearch}
          disabled={loading || !trustId || !serviceName}
        >
          Search
        </button>
      </div>

      <div className="interface-stats-card">
        <div className="interface-stats-card-header">
          <h3>{chartTitle}</h3>
          <button
            type="button"
            className="interface-stats-download"
            onClick={handleDownloadPdf}
            disabled={loading || !chartData.length}
            aria-label="Download PDF"
            title="Download PDF"
          >
            <i className="ri-download-2-line" aria-hidden="true" />
          </button>
        </div>

        {loading ? (
          <p className="interface-stats-status">Loading stats data...</p>
        ) : error ? (
          <p className="interface-stats-status error">{error}</p>
        ) : chartData.length ? (
          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={chartData}>
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
                name={
                  isOutboundSelected
                    ? "Pending count"
                    : "Time delay"
                }
                stroke="#2B81BF"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="interface-stats-status">No stats data available.</p>
        )}
      </div>

      {chartData.length > 0 && (
        <div className="interface-stats-pdf-export-shell" aria-hidden="true">
          <div ref={pdfReportRef}>
            <PdfExportReport
              chartData={chartData}
              chartTitle={chartTitle}
              fullMetricLabel={fullMetricLabel}
              fromDateTime={fromDateTime}
              groupByLabel={groupByLabel}
              interfaceAliasLabel={interfaceAliasLabel}
              interfaceLabel={serviceName}
              interfaceTypeLabel={getInterfaceTypeLabel(interfaceType)}
              metricUnitLabel={metricUnitLabel}
              toDateTime={toDateTime}
              trustLabel={trustName}
              yAxisLabel={yAxisLabel}
            />
          </div>
        </div>
      )}
    </div>
  );
}
