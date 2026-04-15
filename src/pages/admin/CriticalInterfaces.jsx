import React, { useEffect, useMemo, useState } from "react";
import CriticalInterfaceForm from "../../components/CriticalInterfaceForm";
import {
  deleteCriticalInterface,
  updateAllCriticalInterfaceAlerts,
  updateAllCriticalInboundReceiverAlerts,
  getCriticalInterfaceById,
  getCriticalInterfaces,
  getCriticalInboundReceiverById,
  getCriticalInboundReceivers,
  updateCriticalInterfaceAlert,
  updateCriticalInboundReceiverAlert,
  updateCriticalInterface,
} from "../../api/metricsService";
import { getTrusts } from "../../api/trustService";
import { filterTrustsByAccess } from "../../utils/trustAccess";
import "./CriticalInterfaces.css";

const VIEW_OPTIONS = {
  INBOUND: "INBOUND",
  OTHER: "OTHER",
};

const ALERT_FILTER_OPTIONS = {
  ALL: "ALL",
  ENABLED: "ENABLED",
  DISABLED: "DISABLED",
};

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

export default function CriticalInterfaces({
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

  const isAlertEnabled = (row) =>
    getBooleanValue(row?.rawItem, ["deleted", "isDeleted"], false);
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

        if (trustList.length > 0) {
          setSelectedTrustId(String(trustList[0].id));
        }
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
      setSelectedTrustId(trusts[0] ? String(trusts[0].id) : "");
    }
  }, [selectedTrustId, trusts]);

  const refreshMetrics = async ({
    trustId = selectedTrustId,
    view = selectedView,
    force = false,
  } = {}) => {
    if (!trustId) {
      return;
    }

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

      return inboundItems.map((item, index) => ({
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
        isMondayIgnore: getFirstValue(item, INBOUND_COLUMNS[5].getters),
      }));
    }

    const queueItems = criticalInterfaces.filter((item) => {
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

    return queueItems.map((item, index) => ({
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
  }, [selectedAlertFilter, tableRows]);

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
    setShowBulkAlertDialog(true);
  };

  const closeBulkAlertDialog = () => {
    setShowBulkAlertDialog(false);
  };

  const confirmBulkAlertChange = async () => {
    try {
      setError("");
      const nextDeletedStatus = !allAlertsEnabled;

      if (selectedView === VIEW_OPTIONS.INBOUND) {
        await updateAllCriticalInboundReceiverAlerts(nextDeletedStatus);
      } else {
        await updateAllCriticalInterfaceAlerts(nextDeletedStatus);
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
      <CriticalInterfaceForm
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
        <h2 className="critical-page-title">Critical interfaces</h2>
      </div>
      <div className="critical-actions">
        {isAdminUser && (
          <button
            type="button"
            className="critical-add-btn"
            onClick={handleAddClick}
          >
            Add Critical Interface
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
            disabled={trustLoading || trusts.length === 0}
          >
            {trusts.length === 0 ? (
              <option value="">No interfaces available</option>
            ) : (
              trusts.map((trust) => (
                <option key={trust.id} value={trust.id}>
                  {trust.name}
                </option>
              ))
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
                <th className="critical-alert-col">Alert</th>
                {isAdminUser && <th>Actions</th>}
              </tr>
            ) : (
              <tr>
                <th>S.No</th>
                <th>Interface Name</th>
                <th className="critical-alert-col">Alert</th>
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
                        ? 9
                        : 8
                      : isAdminUser
                        ? 4
                        : 3
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
                        ? 9
                        : 8
                      : isAdminUser
                        ? 4
                        : 3
                  }
                  className="critical-empty-row"
                >
                  No {selectedView === VIEW_OPTIONS.INBOUND ? "inbound" : "other"} components found.
                </td>
              </tr>
            )}

            {!tableLoading &&
              filteredTableRows.map((row) =>
                selectedView === VIEW_OPTIONS.INBOUND ? (
                  <tr key={row.id}>
                    <td>{row.serialNo}</td>
                    <td>{row.inboundName}</td>
                    <td>{row.weekDayInside}</td>
                    <td>{row.weekDayOutside}</td>
                    <td>{row.weekendInside}</td>
                    <td>{row.weekendOutside}</td>
                    <td>{row.isMondayIgnore}</td>
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
    </div>
  );
}
