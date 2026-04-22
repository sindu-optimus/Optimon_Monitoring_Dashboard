import React, { useEffect, useMemo, useState } from "react";
import AlertsModuleForm from "../../components/AlertsModuleForm";
import {
  deleteCriticalInterface,
  getCriticalInboundReceiverById,
  getCriticalInboundReceivers,
  updateAllCriticalInterfaceAlerts,
  updateAllCriticalInboundReceiverAlerts,
  getCriticalInterfaceById,
  getCriticalInterfaces,
  updateCriticalInterfaceAlert,
  updateCriticalInboundReceiverAlert,
} from "../../api/criticalInterfacesService";
import { getTrusts } from "../../api/trustService";
import { filterTrustsByAccess } from "../../utils/trustAccess";
import "./AlertsModule.css";

const VIEW_OPTIONS = {
  INBOUND: "INBOUND",
  OTHER: "OTHER",
};

const ALERT_FILTER_OPTIONS = {
  ALL: "ALL",
  ENABLED: "ENABLED",
  DISABLED: "DISABLED",
};

const TYPE_FILTER_OPTIONS = {
  ALL: "ALL",
  CRITICAL: "CRITICAL",
  NON_CRITICAL: "NON_CRITICAL",
};

const DEFAULT_PAGE_SIZE = 10;

const INBOUND_COLUMNS = [
  {
    key: "serviceName",
    label: "Inbound Name",
    getters: ["serviceName", "interfaceName", "interface_name", "name"],
  },
  {
    key: "weekDayInside",
    label:
      "Idle time: Weekday (Inside business hours 09:00 AM to 07:00 PM)",
    getters: [
      "dayIdleTime",
      "idleTimeWeekDayInsideBusinessHours",
      "weekdayInsideBusinessHours",
      "weekDayInsideBusinessHours",
    ],
  },
  {
    key: "weekDayOutside",
    label: "Weekday (Outside Business 07:00 PM to 09:00 AM)",
    getters: [
      "nightIdleTime",
      "weekDayOutsideBusinessHours",
      "weekdayOutsideBusinessHours",
      "outsideBusinessHoursWeekDay",
    ],
  },
  {
    key: "weekendInside",
    label:
      "Idle time: Weekend (Inside business hours 09:00 AM to 07:00 PM)",
    getters: [
      "weDayIdleTime",
      "weekendDayIdleTime",
      "idleTimeWeekendInsideBusinessHours",
      "weekendInsideBusinessHours",
    ],
  },
  {
    key: "weekendOutside",
    label: "Weekend (Outside Business 07:00 PM to 09:00 AM)",
    getters: [
      "weNightIdleTime",
      "weekendNightIdleTime",
      "weekendOutsideBusinessHours",
      "outsideBusinessHoursWeekend",
    ],
  },
  {
    key: "isMondayIgnore",
    label: "Is Monday ignore",
    getters: ["isMondayIgnore", "mondayIgnore"],
  },
];

const getFirstValue = (item, getters) => {
  for (const key of getters) {
    const value = item?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }

  return "-";
};

const getBooleanValue = (item, getters, fallback = false) => {
  for (const key of getters) {
    const value = item?.[key];

    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "string") {
      const normalizedValue = value.trim().toLowerCase();

      if (["true", "yes", "1"].includes(normalizedValue)) {
        return true;
      }

      if (["false", "no", "0"].includes(normalizedValue)) {
        return false;
      }
    }
  }

  return fallback;
};

const unwrapApiData = (response) => response?.data ?? response;

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

const getTrustIdFromItem = (item) =>
  item?.trustId ?? item?.trust_id ?? item?.trust?.id ?? item?.trust?.trustId;

const getTrustNameFromItem = (item) =>
  item?.trustName ?? item?.trust_name ?? item?.trust?.name;

const getInboundReceiverFromApiResponse = (response) => {
  const data = unwrapApiData(response);
  return data?.data ?? data?.criticalInboundReceiver ?? data;
};

const getUpdatedOnValue = (item) =>
  item?.updatedOn ??
  item?.updated_on ??
  item?.updatedAt ??
  item?.updated_at ??
  item?.modifiedOn ??
  item?.modified_on ??
  item?.modifiedAt ??
  item?.modified_at ??
  item?.lastUpdated ??
  item?.last_updated;

const formatDateTime = (value) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const pad = (part) => String(part).padStart(2, "0");

  return `${[
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-")} ${[
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join(":")}`;
};

const getCurrentViewFromType = (interfaceType) =>
  String(interfaceType).toUpperCase() === VIEW_OPTIONS.INBOUND
    ? VIEW_OPTIONS.INBOUND
    : VIEW_OPTIONS.OTHER;

const getAlertFilterValue = (alertFilter) => {
  if (alertFilter === ALERT_FILTER_OPTIONS.ENABLED) {
    return true;
  }

  if (alertFilter === ALERT_FILTER_OPTIONS.DISABLED) {
    return false;
  }

  return undefined;
};

export default function AlertsModule({
  isAdminUser = false,
  userProfile = null,
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingInterface, setEditingInterface] = useState(null);
  const [trusts, setTrusts] = useState([]);
  const [selectedTrustId, setSelectedTrustId] = useState("");
  const [selectedView, setSelectedView] = useState(VIEW_OPTIONS.INBOUND);
  const [selectedAlertFilter, setSelectedAlertFilter] = useState(
    ALERT_FILTER_OPTIONS.ALL
  );
  const [selectedTypeFilter, setSelectedTypeFilter] = useState(
    TYPE_FILTER_OPTIONS.ALL
  );
  const [criticalInterfaces, setCriticalInterfaces] = useState([]);
  const [criticalInboundReceivers, setCriticalInboundReceivers] = useState([]);
  const [trustLoading, setTrustLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [loadedViews, setLoadedViews] = useState({
    [VIEW_OPTIONS.INBOUND]: false,
    [VIEW_OPTIONS.OTHER]: false,
  });
  const [error, setError] = useState("");
  const [deleteLoadingId, setDeleteLoadingId] = useState(null);
  const [alertDialogRow, setAlertDialogRow] = useState(null);
  const [showBulkAlertDialog, setShowBulkAlertDialog] = useState(false);
  const [showTrustSelectionDialog, setShowTrustSelectionDialog] =
    useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const isAlertEnabled = (row) =>
    getBooleanValue(row?.rawItem, ["deleted", "isDeleted"], false);
  const isCriticalRow = (row) =>
    getBooleanValue(
      row?.rawItem,
      ["isCritical", "critical", "is_critical"],
      false
    );
  const selectedTrust = trusts.find(
    (trust) => String(trust.id) === String(selectedTrustId)
  );
  const selectedTrustName = selectedTrust?.name || "";

  useEffect(() => {
    let isActive = true;

    const loadTrusts = async () => {
      try {
        setTrustLoading(true);
        const response = await getTrusts();
        if (!isActive) return;

        const trustList = filterTrustsByAccess(response.data || [], userProfile);
        setTrusts(trustList);
      } catch (loadError) {
        if (!isActive) return;
        console.error("Error fetching trusts:", loadError);
        setError("Failed to load trusts.");
      } finally {
        if (isActive) {
          setTrustLoading(false);
        }
      }
    };

    loadTrusts();

    return () => {
      isActive = false;
    };
  }, [userProfile]);

  useEffect(() => {
    if (
      selectedTrustId &&
      !trusts.some((trust) => String(trust.id) === String(selectedTrustId))
    ) {
      setSelectedTrustId("");
    }
  }, [selectedTrustId, trusts]);

  const refreshMetrics = async ({
    trustId = selectedTrustId,
    view = selectedView,
    force = false,
  } = {}) => {
    if (!force && loadedViews[view]) {
      return;
    }

    try {
      setTableLoading(true);
      setError("");

      if (view === VIEW_OPTIONS.INBOUND) {
        const inboundResult = await getCriticalInboundReceivers({
          trustId,
          isDeleted: getAlertFilterValue(selectedAlertFilter),
        });
        setCriticalInboundReceivers(getListFromApiResponse(inboundResult));
      } else {
        const interfaceResult = await getCriticalInterfaces({
          trustId,
          isDeleted: getAlertFilterValue(selectedAlertFilter),
        });
        setCriticalInterfaces(getListFromApiResponse(interfaceResult));
      }

      setLoadedViews((prev) => ({
        ...prev,
        [view]: true,
      }));
    } catch (loadError) {
      console.error("Error fetching critical interfaces:", loadError);
      if (view === VIEW_OPTIONS.INBOUND) {
        setCriticalInboundReceivers([]);
        setError("Failed to load inbound components.");
      } else {
        setCriticalInterfaces([]);
        setError("Failed to load other component data.");
      }
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    refreshMetrics({
      force: true,
    });
  }, [selectedAlertFilter, selectedTrustId, selectedView]);

  const tableRows = useMemo(() => {
    if (selectedView === VIEW_OPTIONS.INBOUND) {
      const selectedTrust = trusts.find(
        (trust) => String(trust.id) === String(selectedTrustId)
      );
      const selectedTrustName = selectedTrust?.name;
      const inboundItems = criticalInboundReceivers.filter((item) => {
        if (!selectedTrustId) {
          return true;
        }

        const itemTrustId = getTrustIdFromItem(item);
        if (itemTrustId !== undefined && itemTrustId !== null) {
          return String(itemTrustId) === String(selectedTrustId);
        }

        const itemTrustName = getTrustNameFromItem(item);
        if (itemTrustName && selectedTrustName) {
          return String(itemTrustName) === String(selectedTrustName);
        }

        return true;
      });

      const sortedInboundItems = [...inboundItems].sort((a, b) => {
        const firstName = getFirstValue(a, INBOUND_COLUMNS[0].getters);
        const secondName = getFirstValue(b, INBOUND_COLUMNS[0].getters);

        return firstName.localeCompare(secondName, undefined, {
          sensitivity: "base",
        });
      });

      return sortedInboundItems.map((item, index) => {
        const isMondayIgnoreBool = getBooleanValue(item, INBOUND_COLUMNS[5].getters);

        return {
          id: item?.id ?? `inbound-${index}`,
          interfaceType: VIEW_OPTIONS.INBOUND,
          trustId: selectedTrustId,
          rawItem: item,
          serialNo: index + 1,
          inboundName: getFirstValue(item, INBOUND_COLUMNS[0].getters),
          weekDayInside: getFirstValue(item, INBOUND_COLUMNS[1].getters),
          weekDayOutside: getFirstValue(item, INBOUND_COLUMNS[2].getters),
          weekendInside: getFirstValue(item, INBOUND_COLUMNS[3].getters),
          weekendOutside: getFirstValue(item, INBOUND_COLUMNS[4].getters),
          isMondayIgnore: isMondayIgnoreBool ? "Yes" : "No",
          isCritical: getBooleanValue(item, [
            "isCritical",
            "critical",
            "is_critical",
          ])
            ? "Yes"
            : "No",
          updatedOn: formatDateTime(getUpdatedOnValue(item)),
        };
      });
    }

    const queueItems = criticalInterfaces.filter((item) => {
      if (!selectedTrustId) {
        return true;
      }

      const itemTrustId = getTrustIdFromItem(item);
      if (itemTrustId !== undefined && itemTrustId !== null) {
        return String(itemTrustId) === String(selectedTrustId);
      }

      const itemTrustName = getTrustNameFromItem(item);
      if (itemTrustName && selectedTrustName) {
        return String(itemTrustName) === String(selectedTrustName);
      }

      return true;
    });

    const sortedQueueItems = [...queueItems].sort((a, b) => {
      const firstName = getFirstValue(a, [
        "endpointName",
        "interfaceName",
        "interface_name",
        "queueName",
        "serviceName",
        "name",
      ]);
      const secondName = getFirstValue(b, [
        "endpointName",
        "interfaceName",
        "interface_name",
        "queueName",
        "serviceName",
        "name",
      ]);

      return firstName.localeCompare(secondName, undefined, {
        sensitivity: "base",
      });
    });

    return sortedQueueItems.map((item, index) => ({
      id: item?.id ?? `queue-${index}`,
      interfaceType: VIEW_OPTIONS.OTHER,
      trustId: selectedTrustId,
      rawItem: item,
      serialNo: index + 1,
      interfaceName: getFirstValue(item, [
        "endpointName",
        "interfaceName",
        "interface_name",
        "queueName",
        "serviceName",
        "name",
      ]),
      isCritical: getBooleanValue(item, [
        "isCritical",
        "critical",
        "is_critical",
      ])
        ? "Yes"
        : "No",
      updatedOn: formatDateTime(getUpdatedOnValue(item)),
    }));
  }, [
    criticalInboundReceivers,
    criticalInterfaces,
    selectedTrustId,
    selectedTrustName,
    selectedView,
    trusts,
  ]);

  const filteredTableRows = useMemo(() => {
    const filteredRows = tableRows.filter((row) => {
      if (selectedTypeFilter === TYPE_FILTER_OPTIONS.CRITICAL) {
        if (!isCriticalRow(row)) {
          return false;
        }
      }

      if (selectedTypeFilter === TYPE_FILTER_OPTIONS.NON_CRITICAL) {
        if (isCriticalRow(row)) {
          return false;
        }
      }

      if (selectedAlertFilter === ALERT_FILTER_OPTIONS.ENABLED) {
        return isAlertEnabled(row);
      }

      if (selectedAlertFilter === ALERT_FILTER_OPTIONS.DISABLED) {
        return !isAlertEnabled(row);
      }

      return true;
    });

    return filteredRows.map((row, index) => ({
      ...row,
      serialNo: index + 1,
    }));
  }, [selectedAlertFilter, selectedTypeFilter, tableRows]);

  const totalPages = Math.max(1, Math.ceil(filteredTableRows.length / pageSize));
  const paginatedTableRows = useMemo(() => {
    const startIndex = currentPage * pageSize;
    return filteredTableRows.slice(startIndex, startIndex + pageSize);
  }, [currentPage, filteredTableRows, pageSize]);
  const paginationStart = filteredTableRows.length === 0
    ? 0
    : currentPage * pageSize + 1;
  const paginationEnd = Math.min(
    currentPage * pageSize + paginatedTableRows.length,
    filteredTableRows.length
  );
  const canGoPrevious = !tableLoading && currentPage > 0;
  const canGoNext = !tableLoading && currentPage < totalPages - 1;
  const displayPage = currentPage + 1;

  useEffect(() => {
    setCurrentPage(0);
  }, [selectedTrustId, selectedView, selectedAlertFilter, selectedTypeFilter]);

  useEffect(() => {
    if (currentPage >= totalPages) {
      setCurrentPage(Math.max(totalPages - 1, 0));
    }
  }, [currentPage, totalPages]);

  const handlePageSizeChange = (e) => {
    const numericValue = Number(e.target.value);

    if (!Number.isFinite(numericValue)) {
      return;
    }

    const nextPageSize = Math.max(1, Math.floor(numericValue));
    setPageSize(nextPageSize);
    setCurrentPage(0);
  };

  const handlePreviousPage = () => {
    if (!canGoPrevious) return;
    setCurrentPage((prev) => Math.max(prev - 1, 0));
  };

  const handleNextPage = () => {
    if (!canGoNext) return;
    setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1));
  };

  const handleAddClick = () => {
    setEditingInterface(null);
    setShowForm(true);
  };

  const handleEdit = async (row) => {
    if (!isAdminUser) return;

    try {
      setTableLoading(true);
      setError("");
      const response =
        row.interfaceType === VIEW_OPTIONS.INBOUND
          ? await getCriticalInboundReceiverById(row.id)
          : await getCriticalInterfaceById(row.id);
      const item =
        row.interfaceType === VIEW_OPTIONS.INBOUND
          ? getInboundReceiverFromApiResponse(response)
          : getInboundReceiverFromApiResponse(response);
      const receiverTrustName = getTrustNameFromItem(item);
      const receiverTrust = trusts.find(
        (trust) => String(trust.name) === String(receiverTrustName)
      );

      setEditingInterface({
        ...row,
        trustId:
          getTrustIdFromItem(item) ??
          receiverTrust?.id ??
          row.trustId ??
          selectedTrustId,
        rawItem: item || row.rawItem,
      });
      setShowForm(true);
    } catch (editError) {
      console.error("Error fetching critical inbound receiver:", editError);
      setError(editError.message || "Unable to load inbound component.");
    } finally {
      setTableLoading(false);
    }
  };

  const handleDelete = async (row) => {
    if (!isAdminUser) return;

    const interfaceLabel =
      row.interfaceType === VIEW_OPTIONS.INBOUND
        ? row.inboundName
        : row.interfaceName;

    if (!window.confirm(`Delete ${interfaceLabel || "this interface"}?`)) {
      return;
    }

    try {
      setDeleteLoadingId(row.id);
      setError("");
      await deleteCriticalInterface({
        trustId: selectedTrustId,
        interfaceType: row.interfaceType,
        interfaceId: row.id,
      });
      await refreshMetrics({
        trustId: selectedTrustId,
        view: row.interfaceType,
        force: true,
      });
    } catch (deleteError) {
      console.error("Error deleting critical interface:", deleteError);
      setError(deleteError.message || "Unable to delete interface.");
    } finally {
      setDeleteLoadingId(null);
    }
  };

  const handleFormSuccess = async (savedInterfaceType) => {
    const nextView = getCurrentViewFromType(savedInterfaceType || selectedView);
    setEditingInterface(null);
    setShowForm(false);
    setSelectedView(nextView);
    await refreshMetrics({
      trustId: selectedTrustId,
      view: nextView,
      force: true,
    });
  };

  const handleFormCancel = () => {
    setEditingInterface(null);
    setShowForm(false);
  };

  const openAlertDialog = (row) => {
    setAlertDialogRow(row);
  };

  const closeAlertDialog = () => {
    setAlertDialogRow(null);
  };

  const confirmAlertStatusChange = async () => {
    if (!alertDialogRow) return;

    try {
      setError("");
      const nextDeletedStatus = !isAlertEnabled(alertDialogRow);

      if (alertDialogRow.interfaceType === VIEW_OPTIONS.INBOUND) {
        await updateCriticalInboundReceiverAlert(
          alertDialogRow.id,
          nextDeletedStatus
        );
      } else {
        await updateCriticalInterfaceAlert(
          alertDialogRow.id,
          nextDeletedStatus
        );
      }

      setAlertDialogRow(null);
      await refreshMetrics({
        trustId: selectedTrustId,
        view: alertDialogRow.interfaceType,
        force: true,
      });
    } catch (alertError) {
      console.error("Error updating alert status:", alertError);
      setError(alertError.message || "Unable to update alert status.");
    }
  };

  const enabledAlertCount = tableRows.filter((row) => isAlertEnabled(row)).length;
  const allAlertsEnabled =
    tableRows.length > 0 && enabledAlertCount === tableRows.length;

  const openBulkAlertDialog = () => {
    if (tableRows.length === 0) return;
    if (!selectedTrustId) {
      setShowTrustSelectionDialog(true);
      return;
    }
    setShowBulkAlertDialog(true);
  };

  const closeBulkAlertDialog = () => {
    setShowBulkAlertDialog(false);
  };

  const closeTrustSelectionDialog = () => {
    setShowTrustSelectionDialog(false);
  };

  const confirmBulkAlertChange = async () => {
    try {
      setError("");
      const nextDeletedStatus = !allAlertsEnabled;

      console.log("[AlertsModule] Bulk alert change:", {
        trustId: selectedTrustId,
        trustName: selectedTrustName,
        view: selectedView,
        isDeleted: nextDeletedStatus,
        action: nextDeletedStatus ? "enable_all" : "disable_all",
      });

      if (selectedView === VIEW_OPTIONS.INBOUND) {
        await updateAllCriticalInboundReceiverAlerts({
          isDeleted: nextDeletedStatus,
          trustId: selectedTrustId,
        });
      } else {
        await updateAllCriticalInterfaceAlerts({
          isDeleted: nextDeletedStatus,
          trustId: selectedTrustId,
        });
      }

      setShowBulkAlertDialog(false);
      await refreshMetrics({
        trustId: selectedTrustId,
        view: selectedView,
        force: true,
      });
    } catch (alertError) {
      console.error("Error updating alert statuses:", alertError);
      setError(alertError.message || "Unable to update alert statuses.");
    }
  };

  if (showForm) {
    return (
      <AlertsModuleForm
        initial={editingInterface}
        trusts={trusts}
        defaultTrustId={selectedTrustId}
        defaultView={editingInterface?.interfaceType || selectedView}
        onSuccess={handleFormSuccess}
        onCancel={handleFormCancel}
      />
    );
  }

  return (
    <div className="content">
      <div className="critical-page-header">
        <h2 className="critical-page-title">Interface Alerts</h2>
      </div>
      <div className="critical-actions">
        {isAdminUser && (
          <button
            type="button"
            className="critical-add-btn"
            onClick={handleAddClick}
          >
            Add Interface Alert
          </button>
        )}
      </div>

      <div className="critical-toolbar">
        <div className="critical-filter-group">
          <label className="critical-label" htmlFor="critical-trust-select">
            Trust Selection
          </label>

          <select
            id="critical-trust-select"
            className="critical-select"
            value={selectedTrustId}
            onChange={(e) => setSelectedTrustId(e.target.value)}
            disabled={trusts.length === 0}
          >
            {trusts.length === 0 ? (
              <option value="">All Trusts</option>
            ) : (
              <>
                <option value="">All Trusts</option>
                {trusts.map((trust) => (
                  <option key={trust.id} value={trust.id}>
                    {trust.name}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>

        <div className="critical-filter-group">
          <label className="critical-label" htmlFor="critical-alert-filter">
            Alert Filter
          </label>

          <select
            id="critical-alert-filter"
            className="critical-select"
            value={selectedAlertFilter}
            onChange={(e) => setSelectedAlertFilter(e.target.value)}
          >
            <option value={ALERT_FILTER_OPTIONS.ALL}>All</option>
            <option value={ALERT_FILTER_OPTIONS.ENABLED}>Enabled</option>
            <option value={ALERT_FILTER_OPTIONS.DISABLED}>Disabled</option>
          </select>
        </div>

        <div className="critical-filter-group">
          <label className="critical-label" htmlFor="critical-type-filter">
            Type
          </label>

          <select
            id="critical-type-filter"
            className="critical-select"
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
          >
            <option value={TYPE_FILTER_OPTIONS.ALL}>All</option>
            <option value={TYPE_FILTER_OPTIONS.CRITICAL}>Critical</option>
            <option value={TYPE_FILTER_OPTIONS.NON_CRITICAL}>
              Non-critical
            </option>
          </select>
        </div>

        <div className="critical-toolbar-right">
          <div className="critical-bulk-alert-wrap">
            <label className="critical-label" htmlFor="critical-bulk-alert-btn">
              Turn off all alerts
            </label>
            <button
              id="critical-bulk-alert-btn"
              type="button"
              className={`critical-switch critical-switch-lg ${
                allAlertsEnabled ? "enabled" : "disabled"
              }`}
              onClick={openBulkAlertDialog}
              disabled={tableRows.length === 0}
              role="switch"
              aria-checked={allAlertsEnabled}
              aria-label={
                allAlertsEnabled ? "Disable all alerts" : "Enable all alerts"
              }
              title={
                tableRows.length === 0
                  ? "No interfaces available"
                  : !selectedTrustId
                  ? "Select a trust to change all alerts"
                  : allAlertsEnabled
                  ? "Disable all alerts"
                  : "Enable all alerts"
              }
            >
              <span className="critical-switch-track">
                <span className="critical-switch-thumb"></span>
              </span>
            </button>
          </div>

          <div
            className="critical-toggle-wrap"
            role="tablist"
            aria-label="View toggle"
          >
            <button
              type="button"
              className={`critical-toggle-btn ${
                selectedView === VIEW_OPTIONS.INBOUND ? "active" : ""
              }`}
              onClick={() => setSelectedView(VIEW_OPTIONS.INBOUND)}
            >
              Inbound components
            </button>

            <button
              type="button"
              className={`critical-toggle-btn ${
                selectedView === VIEW_OPTIONS.OTHER ? "active" : ""
              }`}
              onClick={() => setSelectedView(VIEW_OPTIONS.OTHER)}
            >
              All other components
            </button>
          </div>
        </div>
      </div>

      {error && <p className="critical-status critical-error">{error}</p>}

      <div className="critical-table-card">
        <table className="critical-table">
          <thead>
            {selectedView === VIEW_OPTIONS.INBOUND ? (
              <tr>
                <th>S.No</th>
                {INBOUND_COLUMNS.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
                <th>IsCritical</th>
                <th className="critical-alert-col">Alert</th>
                <th>UpdatedOn</th>
                {isAdminUser && <th>Actions</th>}
              </tr>
            ) : (
              <tr>
                <th>S.No</th>
                <th>Interface Name</th>
                <th>IsCritical</th>
                <th className="critical-alert-col">Alert</th>
                <th>UpdatedOn</th>
                {isAdminUser && <th>Actions</th>}
              </tr>
            )}
          </thead>

          <tbody>
            {tableLoading && (
              <tr>
                <td
                  colSpan={
                    selectedView === VIEW_OPTIONS.INBOUND
                      ? isAdminUser
                        ? 11
                        : 10
                      : isAdminUser
                        ? 6
                        : 5
                  }
                  className="critical-empty-row"
                >
                  Loading interfaces...
                </td>
              </tr>
            )}

            {!tableLoading && filteredTableRows.length === 0 && (
              <tr>
                <td
                  colSpan={
                    selectedView === VIEW_OPTIONS.INBOUND
                      ? isAdminUser
                        ? 11
                        : 10
                      : isAdminUser
                        ? 6
                        : 5
                  }
                  className="critical-empty-row"
                >
                  No {selectedView === VIEW_OPTIONS.INBOUND ? "inbound" : "other"} components found.
                </td>
              </tr>
            )}

            {!tableLoading &&
              paginatedTableRows.map((row) =>
                selectedView === VIEW_OPTIONS.INBOUND ? (
                  <tr key={row.id}>
                    <td>{row.serialNo}</td>
                    <td>{row.inboundName}</td>
                    <td>{row.weekDayInside}</td>
                    <td>{row.weekDayOutside}</td>
                    <td>{row.weekendInside}</td>
                    <td>{row.weekendOutside}</td>
                    <td>
                      <span className={`monday-badge ${row.isMondayIgnore === "Yes" ? "yes" : "no"}`}>
                        {row.isMondayIgnore}
                      </span>
                    </td>
                    <td>{row.isCritical}</td>
                    <td className="critical-alert-cell">
                      <button
                        type="button"
                        className={`critical-switch ${
                          isAlertEnabled(row) ? "enabled" : "disabled"
                        }`}
                        onClick={() => openAlertDialog(row)}
                        role="switch"
                        aria-checked={isAlertEnabled(row)}
                        aria-label={
                          isAlertEnabled(row)
                            ? "Disable alert"
                            : "Enable alert"
                        }
                        title={
                          isAlertEnabled(row)
                            ? "Disable alert"
                            : "Enable alert"
                        }
                      >
                        <span className="critical-switch-track">
                          <span className="critical-switch-thumb"></span>
                        </span>
                      </button>
                    </td>
                    <td>{row.updatedOn}</td>
                    {isAdminUser && (
                      <td>
                        <div className="critical-action-buttons">
                          <button
                            type="button"
                            className="critical-icon-btn edit-btn"
                            onClick={() => handleEdit(row)}
                            title="Edit interface"
                          >
                            <i className="ri-pencil-line"></i>
                          </button>
                          <button
                            type="button"
                            className="critical-icon-btn delete-btn"
                            onClick={() => handleDelete(row)}
                            title="Delete interface"
                            disabled={deleteLoadingId === row.id}
                          >
                            <i className="ri-delete-bin-6-line"></i>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ) : (
                  <tr key={row.id}>
                    <td>{row.serialNo}</td>
                    <td>{row.interfaceName}</td>
                    <td>{row.isCritical}</td>
                    <td className="critical-alert-cell">
                      <button
                        type="button"
                        className={`critical-switch ${
                          isAlertEnabled(row) ? "enabled" : "disabled"
                        }`}
                        onClick={() => openAlertDialog(row)}
                        role="switch"
                        aria-checked={isAlertEnabled(row)}
                        aria-label={
                          isAlertEnabled(row)
                            ? "Disable alert"
                            : "Enable alert"
                        }
                        title={
                          isAlertEnabled(row)
                            ? "Disable alert"
                            : "Enable alert"
                        }
                      >
                        <span className="critical-switch-track">
                          <span className="critical-switch-thumb"></span>
                        </span>
                      </button>
                    </td>
                    <td>{row.updatedOn}</td>
                    {isAdminUser && (
                      <td>
                        <div className="critical-action-buttons">
                          <button
                            type="button"
                            className="critical-icon-btn edit-btn"
                            onClick={() => handleEdit(row)}
                            title="Edit interface"
                          >
                            <i className="ri-pencil-line"></i>
                          </button>
                          <button
                            type="button"
                            className="critical-icon-btn delete-btn"
                            onClick={() => handleDelete(row)}
                            title="Delete interface"
                            disabled={deleteLoadingId === row.id}
                          >
                            <i className="ri-delete-bin-6-line"></i>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              )}
          </tbody>
        </table>
      </div>

      {!tableLoading && filteredTableRows.length > 0 && (
        <div className="paginationControls">
          <div className="paginationShowing">
            Showing {paginationStart} to {paginationEnd}
          </div>

          <div className="paginationPages">
            <label className="critical-pagination-label critical-page-size-wrapper">
              Page Size:
              <input
                type="number"
                className="critical-page-size-input"
                value={pageSize}
                min={1}
                step={1}
                onChange={handlePageSizeChange}
              />
            </label>

            <button
              type="button"
              className="paginationBtn"
              onClick={handlePreviousPage}
              disabled={!canGoPrevious}
            >
              Prev
            </button>

            <span className="paginationInfo">
              Page {displayPage} of {totalPages}
            </span>

            <button
              type="button"
              className="paginationBtn"
              onClick={handleNextPage}
              disabled={!canGoNext}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {alertDialogRow && (
        <div className="critical-modal-overlay" role="dialog" aria-modal="true">
          <div className="critical-modal">
            <h3>
              {isAlertEnabled(alertDialogRow)
                ? "Disable Alert"
                : "Enable Alert"}
            </h3>
            <p>
              Are you sure you want to{" "}
              {isAlertEnabled(alertDialogRow) ? "disable" : "enable"} alert for{" "}
              <strong>
                {alertDialogRow.interfaceType === VIEW_OPTIONS.INBOUND
                  ? alertDialogRow.inboundName
                  : alertDialogRow.interfaceName}
              </strong>
              ?
            </p>
            <div className="critical-modal-actions">
              <button
                type="button"
                className="critical-modal-cancel"
                onClick={closeAlertDialog}
              >
                Cancel
              </button>
              <button
                type="button"
                className="critical-modal-confirm"
                onClick={confirmAlertStatusChange}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {showBulkAlertDialog && (
        <div className="critical-modal-overlay" role="dialog" aria-modal="true">
          <div className="critical-modal">
            <h3>{allAlertsEnabled ? "Disable All Alerts" : "Enable All Alerts"}</h3>
            <p>
              Are you sure you want to {allAlertsEnabled ? "disable" : "enable"}{" "}
              all alerts for the selected trust in this view?
            </p>
            <div className="critical-modal-actions">
              <button
                type="button"
                className="critical-modal-cancel"
                onClick={closeBulkAlertDialog}
              >
                Cancel
              </button>
              <button
                type="button"
                className="critical-modal-confirm"
                onClick={confirmBulkAlertChange}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {showTrustSelectionDialog && (
        <div className="critical-modal-overlay" role="dialog" aria-modal="true">
          <div className="critical-modal">
            <h3>Select One Trust</h3>
            <p>
              Bulk enable or disable is available only for a single trust.
              Please select one trust and try again.
            </p>
            <div className="critical-modal-actions">
              <button
                type="button"
                className="critical-modal-confirm"
                onClick={closeTrustSelectionDialog}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
