import React, { useEffect, useMemo, useState } from "react";
import CriticalInterfaceForm from "../../components/CriticalInterfaceForm";
import {
  deleteCriticalInterface,
  getMetricDetails,
} from "../../api/metricsService";
import { getTrusts } from "../../api/trustService";
import "./CriticalInterfaces.css";

const ALERT_STORAGE_KEY = "critical-interface-alert-status";
const VIEW_OPTIONS = {
  INBOUND: "INBOUND",
  OTHER: "OTHER",
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
      "idleTimeWeekDayInsideBusinessHours",
      "weekdayInsideBusinessHours",
      "weekDayInsideBusinessHours",
    ],
  },
  {
    key: "weekDayOutside",
    label: "Weekday (Outside Business 07:00 PM to 09:00 AM)",
    getters: [
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
      "idleTimeWeekendInsideBusinessHours",
      "weekendInsideBusinessHours",
    ],
  },
  {
    key: "weekendOutside",
    label: "Weekend (Outside Business 07:00 PM to 09:00 AM)",
    getters: [
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

export default function CriticalInterfaces({ isAdminUser = false }) {
  const [showForm, setShowForm] = useState(false);
  const [editingInterface, setEditingInterface] = useState(null);
  const [trusts, setTrusts] = useState([]);
  const [selectedTrustId, setSelectedTrustId] = useState("");
  const [selectedView, setSelectedView] = useState(VIEW_OPTIONS.INBOUND);
  const [metricsData, setMetricsData] = useState(null);
  const [trustLoading, setTrustLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState("");
  const [deleteLoadingId, setDeleteLoadingId] = useState(null);
  const [alertStatuses, setAlertStatuses] = useState({});
  const [alertDialogRow, setAlertDialogRow] = useState(null);
  const [showBulkAlertDialog, setShowBulkAlertDialog] = useState(false);

  useEffect(() => {
    try {
      const storedValue = window.localStorage.getItem(ALERT_STORAGE_KEY);
      setAlertStatuses(storedValue ? JSON.parse(storedValue) : {});
    } catch (storageError) {
      console.error("Error reading alert status from storage:", storageError);
      setAlertStatuses({});
    }
  }, []);

  const buildAlertStorageId = (row) =>
    [selectedTrustId, row.interfaceType, row.id].join("__");

  const isAlertEnabled = (row) =>
    Boolean(alertStatuses[buildAlertStorageId(row)]);

  const persistAlertStatuses = (nextStatuses) => {
    setAlertStatuses(nextStatuses);
    try {
      window.localStorage.setItem(
        ALERT_STORAGE_KEY,
        JSON.stringify(nextStatuses)
      );
    } catch (storageError) {
      console.error("Error saving alert status to storage:", storageError);
    }
  };

  useEffect(() => {
    let isActive = true;

    const loadTrusts = async () => {
      try {
        setTrustLoading(true);
        const response = await getTrusts();
        if (!isActive) return;

        const trustList = Array.isArray(response.data) ? response.data : [];
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
  }, []);

  const refreshMetrics = async (trustId = selectedTrustId) => {
    if (!trustId) {
      setMetricsData(null);
      return;
    }

    try {
      setTableLoading(true);
      setError("");
      const response = await getMetricDetails(trustId);
      setMetricsData(response || null);
    } catch (loadError) {
      console.error("Error fetching critical interfaces:", loadError);
      setMetricsData(null);
      setError("Failed to load critical interface data.");
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    refreshMetrics(selectedTrustId);
  }, [selectedTrustId]);

  const tableRows = useMemo(() => {
    if (selectedView === VIEW_OPTIONS.INBOUND) {
      const inboundItems = Array.isArray(metricsData?.inboundDetails)
        ? metricsData.inboundDetails
        : [];

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

    const queueItems = Array.isArray(metricsData?.queueDetails)
      ? metricsData.queueDetails
      : [];

    return queueItems.map((item, index) => ({
      id: item?.id ?? `queue-${index}`,
      interfaceType: VIEW_OPTIONS.OTHER,
      trustId: selectedTrustId,
      rawItem: item,
      serialNo: index + 1,
      interfaceName: getFirstValue(item, [
        "queueName",
        "interfaceName",
        "interface_name",
      ]),
    }));
  }, [metricsData, selectedTrustId, selectedView]);

  const handleAddClick = () => {
    setEditingInterface(null);
    setShowForm(true);
  };

  const handleEdit = (row) => {
    if (!isAdminUser) return;

    setEditingInterface(row);
    setShowForm(true);
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
      await refreshMetrics(selectedTrustId);
    } catch (deleteError) {
      console.error("Error deleting critical interface:", deleteError);
      setError(deleteError.message || "Unable to delete interface.");
    } finally {
      setDeleteLoadingId(null);
    }
  };

  const handleFormSuccess = async () => {
    setEditingInterface(null);
    setShowForm(false);
    await refreshMetrics(selectedTrustId);
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

  const confirmAlertStatusChange = () => {
    if (!alertDialogRow) return;

    const storageId = buildAlertStorageId(alertDialogRow);
    const nextStatuses = {
      ...alertStatuses,
      [storageId]: !alertStatuses[storageId],
    };

    persistAlertStatuses(nextStatuses);
    setAlertDialogRow(null);
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

  const confirmBulkAlertChange = () => {
    const nextStatuses = { ...alertStatuses };

    tableRows.forEach((row) => {
      nextStatuses[buildAlertStorageId(row)] = !allAlertsEnabled;
    });

    persistAlertStatuses(nextStatuses);
    setShowBulkAlertDialog(false);
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

        <div className="critical-bulk-alert-wrap">
          <label className="critical-label" htmlFor="critical-bulk-alert-btn">
            Turn off all alerts
          </label>
          <button
            id="critical-bulk-alert-btn"
            type="button"
            className={`critical-bulk-alert-btn ${
              allAlertsEnabled ? "enabled" : "disabled"
            }`}
            onClick={openBulkAlertDialog}
            disabled={tableRows.length === 0}
            title={
              tableRows.length === 0
                ? "No interfaces available"
                : allAlertsEnabled
                ? "Disable all alerts"
                : "Enable all alerts"
            }
          >
            {allAlertsEnabled ? "Enabled" : "Disabled"}
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
                <th>Alert</th>
                {isAdminUser && <th>Actions</th>}
              </tr>
            ) : (
              <tr>
                <th>S.No</th>
                <th>Interface Name</th>
                <th>Alert</th>
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

            {!tableLoading && tableRows.length === 0 && (
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
              tableRows.map((row) =>
                selectedView === VIEW_OPTIONS.INBOUND ? (
                  <tr key={row.id}>
                    <td>{row.serialNo}</td>
                    <td>{row.inboundName}</td>
                    <td>{row.weekDayInside}</td>
                    <td>{row.weekDayOutside}</td>
                    <td>{row.weekendInside}</td>
                    <td>{row.weekendOutside}</td>
                    <td>{row.isMondayIgnore}</td>
                    <td>
                      <button
                        type="button"
                        className={`critical-alert-btn ${
                          isAlertEnabled(row) ? "enabled" : "disabled"
                        }`}
                        onClick={() => openAlertDialog(row)}
                        title={
                          isAlertEnabled(row)
                            ? "Disable alert"
                            : "Enable alert"
                        }
                      >
                        {isAlertEnabled(row) ? "Enabled" : "Disabled"}
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
                    <td>
                      <button
                        type="button"
                        className={`critical-alert-btn ${
                          isAlertEnabled(row) ? "enabled" : "disabled"
                        }`}
                        onClick={() => openAlertDialog(row)}
                        title={
                          isAlertEnabled(row)
                            ? "Disable alert"
                            : "Enable alert"
                        }
                      >
                        {isAlertEnabled(row) ? "Enabled" : "Disabled"}
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
