import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import trendUpImg from "../../assets/trend-up.gif";
import trendDownImg from "../../assets/trend-down.gif";
import "./ServerCard.css";

export default function ServerCard({
  serverName,
  queues = [],
  endpoints = [],
  bgColor = "#fff",
  lastUpdated = null,
  lastUpdatedText = "",
}) {
  const navigate = useNavigate();

  const [tooltip, setTooltip] = useState({
    visible: false,
    text: "",
    x: 0,
    y: 0,
  });

  /* ================= CHECK BACKEND "NO PENDING" ================= */

  const hasBackendNoPending = useMemo(() => {
    return queues.some((q) => {
      const val = String(q.pending || "").toLowerCase();
      return val.includes("no pending");
    });
  }, [queues]);

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

  const renderPending = (pendingRaw) => {
    if (pendingRaw === null || pendingRaw === undefined) return "-";
    const s = String(pendingRaw);
    if (/^\D*no pending/i.test(s)) return "No pending queues";
    return s;
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
          {hasBackendNoPending ? (
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
                  {queues.map((queue) => (
                    <tr
                      key={queue.id ?? queue.name}
                      style={{
                        color: queue.critical ? "#d32f2f" : "#4CAF50",
                      }}
                    >
                      <td>
                        <span
                          className="ellipsis queue-tooltip-target"
                          onMouseEnter={(e) => {
                            const rect =
                              e.currentTarget.getBoundingClientRect();

                            setTooltip({
                              visible: true,
                              text: queue.name,
                              x: rect.left + rect.width / 2,
                              y: rect.bottom + 8,
                            });
                          }}
                          onMouseLeave={() =>
                            setTooltip({
                              visible: false,
                              text: "",
                              x: 0,
                              y: 0,
                            })
                          }
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
                        {renderPending(queue.pending)}

                        {queue.trend?.direction === "up" && (
                          // <i
                          //   className={`ri-arrow-up-line trendUp ${queue.trend.color}`}
                          //   style={{ marginLeft: 6 }}
                          // />
                          
                          <img
                            src={trendUpImg}
                            alt="Trend up"
                            className={`trendIcon ${queue.trend.color}`}
                          />
                        )}

                        {queue.trend?.direction === "down" && (
                          // <i
                          //   className={`ri-arrow-down-line trendDown ${queue.trend.color}`}
                          //   style={{ marginLeft: 6 }}
                          // />
                          <img
                            src={trendDownImg}
                            alt="Trend down"
                            className={`trendIcon ${queue.trend.color}`}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
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
          {endpoints.length > 0 ? (
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
                          onMouseEnter={(e) => {
                            const rect =
                              e.currentTarget.getBoundingClientRect();

                            setTooltip({
                              visible: true,
                              text: endpoint.name,
                              x: rect.left + rect.width / 2,
                              y: rect.bottom + 8,
                            });
                          }}
                          onMouseLeave={() =>
                            setTooltip({
                              visible: false,
                              text: "",
                              x: 0,
                              y: 0,
                            })
                          }
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
            className="queue-tooltip-box"
            style={{
              left: tooltip.x,
              top: tooltip.y,
            }}
          >
            {tooltip.text}
          </div>
        )}
      </div>
    </div>
  );
}
