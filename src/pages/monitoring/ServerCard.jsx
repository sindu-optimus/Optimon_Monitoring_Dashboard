import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import trendUpImg from "../../assets/trend-up.gif";
import trendDownImg from "../../assets/trend-down.gif";
import "./ServerCard.css";

export default function ServerCard({
  serverName,
  queues = [],
  endpoints = [],
  noQueues = false,
  noPendingServices = false,
  bgColor = "#fff",
  lastUpdated = null,
  lastUpdatedText = "",
  supportIssues = [],
}) {
  const navigate = useNavigate();

  const [tooltip, setTooltip] = useState({
    visible: false,
    text: "",
    x: 0,
    y: 0,
    variant: "default",
  });
  const [detailsModal, setDetailsModal] = useState({
    open: false,
    loading: false,
    error: "",
    trustName: "",
    interfaceName: "",
    items: [],
  });
  /* ================= CHECK BACKEND "NO PENDING" ================= */

  const hasBackendNoPending = useMemo(() => {
    return queues.some((q) => {
      const pendingValue = String(q.pending || "").toLowerCase();
      const queueName = String(q.name || q.queueName || "").toLowerCase();

      return (
        pendingValue.includes("no pending") ||
        queueName.includes("no pending")
      );
    });
  }, [queues]);

  const hasBackendNoServices = useMemo(() => {
    return endpoints.some((endpoint) => {
      const name = String(
        endpoint.name ?? endpoint.serviceName ?? endpoint.endpointName ?? ""
      ).toLowerCase();

      return name.includes("no service available");
    });
  }, [endpoints]);

  /* ================= STATUS ================= */

  const isDataOutdated = (createdOn) => {
    if (!createdOn) return false;

    const createdTime = new Date(createdOn).getTime();
    const currentTime = Date.now();
    const diffInMinutes = (currentTime - createdTime) / (1000 * 60);

    return diffInMinutes >= 3;
  };

  const showStatus = isDataOutdated(lastUpdated);

  /* ================= HELPERS ================= */

  const formatIdleRaw = (idleTimeRaw) => {
    if (idleTimeRaw === null || idleTimeRaw === undefined) return "-";
    return String(idleTimeRaw);
  };

  const getPendingDisplay = (pendingRaw) => {
    if (pendingRaw === null || pendingRaw === undefined) return "-";

    const s = String(pendingRaw).trim();

    if (/^\D*no pending/i.test(s)) {
      return {
        countText: "No pending queues",
        reasonText: "",
      };
    }

    const match = s.match(/^(\d+)\s*[,;-]\s*(.+)$/);
    const reasonText = match?.[2]?.trim() || "";
    const hasReadableReason = /[a-zA-Z]{2,}/.test(reasonText);

    if (match && hasReadableReason) {
      return {
        countText: match[1],
        reasonText,
      };
    }

    return {
      countText: s,
      reasonText: "",
    };
  };

  const getItemId = (item) => item?.id ?? item?.supportIssueId ?? null;
  const getItemIssue = (item) => item?.description1 ?? item?.issue ?? "";
  const getItemAction = (item) => item?.description2 ?? item?.action ?? "";
  const getItemInterface = (item) =>
    item?.interface_name ?? item?.interfaceName ?? "";
  const getItemTrustId = (item) => item?.trust_id ?? item?.trustId ?? "";
  const getItemStatus = (item) => (item?.isDeleted ? "Completed" : "Active");
  const isItemActive = (item) => !item?.isDeleted;
  const getItemFinalConclusion = (item) =>
    item?.finalConclusion ?? item?.final_conclusion ?? "";
  const getItemCreatedOn = (item) =>
    item?.createdAt ?? item?.created_at ?? item?.createdOn ?? item?.date ?? "";
  const getItemUpdatedOn = (item) =>
    item?.updatedAt ?? item?.updated_at ?? item?.updatedOn ?? "";
  const getQueueSupportKey = (trustId, interfaceName) =>
    `${String(trustId ?? "").trim().toLowerCase()}::${String(
      interfaceName ?? ""
    )
      .trim()
      .toLowerCase()}`;
  const getPendingCountValue = (pendingRaw) =>
    Number(String(pendingRaw ?? "").replace(/[^\d]/g, "")) || 0;
  const supportIssuesByQueue = useMemo(() => {
    return supportIssues.reduce((acc, item) => {
      if (!isItemActive(item)) {
        return acc;
      }

      const key = getQueueSupportKey(
        getItemTrustId(item),
        getItemInterface(item)
      );

      if (!key.endsWith("::")) {
        if (!acc.has(key)) {
          acc.set(key, []);
        }

        acc.get(key).push(item);
      }

      return acc;
    }, new Map());
  }, [supportIssues]);

  const getMatchedSupportIssues = (queue) =>
    supportIssuesByQueue.get(
      getQueueSupportKey(queue?.trustId, queue?.name)
    ) || [];

  const formatDateTime = (value) => {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);

    const pad = (part) => String(part).padStart(2, "0");

    return [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate()),
    ].join("-") +
      ", " +
      [
        pad(date.getHours()),
        pad(date.getMinutes()),
        pad(date.getSeconds()),
      ].join(":");
  };

  const closeDetailsModal = () => {
    setDetailsModal({
      open: false,
      loading: false,
      error: "",
      trustName: "",
      interfaceName: "",
      items: [],
    });
  };

  const hideTooltip = () =>
    setTooltip({
      visible: false,
      text: "",
      x: 0,
      y: 0,
      variant: "default",
    });

  const showTooltip = (target, text, variant = "default") => {
    const rect = target.getBoundingClientRect();
    const tooltipHalfWidth = 140;
    const viewportPadding = 12;
    const nextX = Math.min(
      Math.max(rect.left + rect.width / 2, tooltipHalfWidth + viewportPadding),
      window.innerWidth - tooltipHalfWidth - viewportPadding
    );

    setTooltip({
      visible: true,
      text,
      x: nextX,
      y: rect.bottom + 8,
      variant,
    });
  };

  const handleInfoIconClick = (queue) => {
    const trustName = serverName;
    const interfaceName = queue.name;
    const matchedItems = getMatchedSupportIssues(queue);

    setDetailsModal({
      open: true,
      loading: false,
      error:
        matchedItems.length > 0
          ? ""
          : "Unable to load support action details.",
      trustName,
      interfaceName,
      items: matchedItems,
    });
  };

  const handleOpenSupportAction = (item, interfaceName) => {
    const itemId = getItemId(item);
    if (!itemId) return;

    closeDetailsModal();
    navigate(`/admin/support-actions/${itemId}`, {
      state: {
        interfaceName,
      },
    });
  };

  /* ================= RENDER ================= */

  return (
    <div className="server">
      {/* ================= HEADER ================= */}
      <div className="server-card">
        <div className="server-header">
          <div className="server-head">
            <h3 className="server-title">{serverName}</h3>

            {lastUpdatedText && (
              <span className="server-last-updated">
                ({lastUpdatedText})
              </span>
            )}
          </div>

          <span className={`pulse-icon ${showStatus ? "danger" : "ok"}`}>
            <svg viewBox="0 0 24 24">
              <circle className="pulse-core" cx="12" cy="12" r="4" />
              <circle className="pulse-ring" cx="12" cy="12" r="4" />
              <circle className="pulse-ring delay" cx="12" cy="12" r="4" />
            </svg>
          </span>
        </div>
      </div>

      {/* ================= BODY ================= */}
      <div className="server-table">

        {/* ================= QUEUES ================= */}
        <h4 className="queue">Queue Status</h4>

        <div className="queue-section">

          {/* BACKEND: NO PENDING */}
          {noQueues || hasBackendNoPending ? (
            <div className="cardEmptyState">
              <i className="ri-checkbox-circle-fill"></i>

              <p>No Pending Queues</p>

              <span>Everything is running smoothly</span>
            </div>
          ) : queues.length > 0 ? (

            /* NORMAL QUEUES */
            <div className="queue-content">
              <table>
                <thead>
                  <tr>
                    <th style={{ backgroundColor: bgColor }}>Queue Name</th>
                    <th style={{ backgroundColor: bgColor }}>
                      Pending Count
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {queues.map((queue) => {
                    const pendingDisplay = getPendingDisplay(queue.pending);
                    const matchedSupportIssues = getMatchedSupportIssues(queue);
                    const hasSupportAction =
                      getPendingCountValue(queue.pending) > 0 &&
                      matchedSupportIssues.length > 0;
                    const supportActionTooltip =
                      String(
                        getItemIssue(matchedSupportIssues[0]) ||
                          "Support action available"
                      ).trim() || "Support action available";

                    return (
                      <tr
                        key={queue.id ?? queue.name}
                        style={{
                          color: hasSupportAction
                            ? "#333"
                            : queue.critical
                              ? "#d32f2f"
                              : "#4CAF50",
                        }}
                      >
                        <td className="pending-count-column">
                          <span
                            className="ellipsis queue-tooltip-target"
                            onMouseEnter={(e) =>
                              showTooltip(e.currentTarget, queue.name)
                            }
                            onMouseLeave={hideTooltip}
                            onClick={() =>
                              navigate(
                                `/action/${encodeURIComponent(queue.name)}`
                              )
                            }
                          >
                            {queue.name}
                          </span>
                        </td>

                        <td>
                          <div className="pending-count-cell">
                            <div className="pending-count-main">
                              <div className="pending-count-text">
                                <span className="pending-count-value">
                                  {pendingDisplay.countText}
                                </span>

                                {pendingDisplay.reasonText && (
                                  <span className="pending-count-reason">
                                    , {pendingDisplay.reasonText}
                                  </span>
                                )}
                              </div>

                              {queue.trend?.direction === "up" && (
                                <img
                                  src={trendUpImg}
                                  alt="Trend up"
                                  className={`trendIcon ${hasSupportAction ? "trendIcon-muted" : ""} ${queue.trend.color}`}
                                />
                              )}

                              {queue.trend?.direction === "down" && (
                                <img
                                  src={trendDownImg}
                                  alt="Trend down"
                                  className={`trendIcon ${hasSupportAction ? "trendIcon-muted" : ""} ${queue.trend.color}`}
                                />
                              )}
                            </div>

                            {hasSupportAction && (
                              <span
                                className="pending-info-icon"
                                onClick={() => handleInfoIconClick(queue)}
                                onMouseEnter={(e) =>
                                  showTooltip(
                                    e.currentTarget,
                                    supportActionTooltip,
                                    "info"
                                  )
                                }
                                onMouseLeave={hideTooltip}
                                aria-label={supportActionTooltip}
                              >
                                <i className="ri-information-line"></i>
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          ) : (

            /* API / DATA ISSUE */
            <p className="noDataText">No queues available</p>

          )}
        </div>

        {/* ================= ENDPOINTS ================= */}
        <h4 className="endpoint">Endpoints Status</h4>

        <div className="endpoint-section">
          {noPendingServices || hasBackendNoServices ? (
            <div className="cardEmptyState">
              <i className="ri-checkbox-circle-fill"></i>

              <p>All Inbounds are active</p>

              <span>Everything is running smoothly</span>
            </div>
          ) : endpoints.length > 0 ? (
            <div className="endpoint-content">
              <table>
                <thead>
                  <tr>
                    <th style={{ backgroundColor: bgColor }}>
                      Service Name
                    </th>
                    <th style={{ backgroundColor: bgColor }}>
                      Idle Time (mins)
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {endpoints.map((endpoint) => (
                    <tr
                      key={endpoint.id ?? endpoint.name}
                      style={{
                        color: endpoint.critical ? "#d32f2f" : "#4CAF50",
                      }}
                    >
                      <td>
                        <span
                          className="ellipsis endpoint-tooltip-target"
                          onMouseEnter={(e) =>
                            showTooltip(e.currentTarget, endpoint.name)
                          }
                          onMouseLeave={hideTooltip}
                          onClick={() =>
                            navigate(
                              `/action/${encodeURIComponent(endpoint.name)}`
                            )
                          }
                        >
                          {endpoint.name}
                        </span>
                      </td>

                      <td>{formatIdleRaw(endpoint.idleTime)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="noDataText">No endpoints available</p>
          )}
        </div>

        {/* ================= TOOLTIP ================= */}
        {tooltip.visible && (
          <div
            className={`queue-tooltip-box ${tooltip.variant === "info" ? "queue-tooltip-box-info" : ""}`}
            style={{
              left: tooltip.x,
              top: tooltip.y,
            }}
          >
            {tooltip.text}
          </div>
        )}

        {detailsModal.open && (
          <div
            className="support-details-overlay"
            role="dialog"
            aria-modal="true"
            onClick={closeDetailsModal}
          >
            <div
              className="support-details-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="support-details-header">
                <div>
                  <h3>Support Action Details</h3>
                  <p>
                    <strong>Trust:</strong> {detailsModal.trustName}
                  </p>
                  <p>
                    <strong>Interface:</strong> {detailsModal.interfaceName}
                  </p>
                </div>

                <button
                  type="button"
                  className="support-details-close"
                  onClick={closeDetailsModal}
                >
                  <i className="ri-close-line"></i>
                </button>
              </div>

              {detailsModal.loading ? (
                <p className="support-details-status">Loading details...</p>
              ) : detailsModal.error ? (
                <p className="support-details-status support-details-error">
                  {detailsModal.error}
                </p>
              ) : (
                <div className="support-details-list">
                  {detailsModal.items.map((item, index) => (
                    <div
                      key={getItemId(item) ?? index}
                      className="support-details-card"
                    >
                      {getItemId(item) && (
                        <button
                          type="button"
                          className="support-details-link-btn"
                          onClick={() =>
                            handleOpenSupportAction(
                              item,
                              detailsModal.interfaceName
                            )
                          }
                          title="Open full support action"
                          aria-label="Open full support action"
                        >
                          <i className="ri-external-link-line"></i>
                        </button>
                      )}
                      <p>
                        <strong>Status:</strong> {getItemStatus(item)}
                      </p>
                      <p>
                        <strong>Reason:</strong>{" "}
                        {String(getItemIssue(item) || "").trim() || "-"}
                      </p>
                      <div className="support-details-html">
                        <strong>Action:</strong>
                        <span
                          dangerouslySetInnerHTML={{
                            __html:
                              String(getItemAction(item) || "").trim() || "-",
                          }}
                        />
                      </div>
                      <p>
                        <strong>Final Conclusion:</strong>{" "}
                        {String(getItemFinalConclusion(item) || "").trim() || "-"}
                      </p>
                      <p>
                        <strong>Created On:</strong>{" "}
                        {formatDateTime(getItemCreatedOn(item))}
                      </p>
                      <p>
                        <strong>Updated On:</strong>{" "}
                        {formatDateTime(getItemUpdatedOn(item))}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
