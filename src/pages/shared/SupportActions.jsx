import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import * as XLSX from "xlsx";
import AddActions from "../../components/AddActions";
import { getTrusts } from "../../api/trustService";
import {
  deleteSupportIssue,
  getSupportIssue,
  getSupportIssues,
} from "../../api/supportService";
import "./SupportActions.css";

const SupportActions = ({ isAdminUser = false, userProfile = null }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { issueId } = useParams();
  const { interfaceName = "" } = location.state || {};
  const isDetailView = Boolean(issueId);
  const baseSupportActionsPath = isDetailView
    ? location.pathname.replace(/\/[^/]+$/, "")
    : location.pathname;
  const navigateToSupportList = () => {
    navigate(baseSupportActionsPath);
  };

  const [showForm, setShowForm] = useState(false);
  const [qaData, setQaData] = useState([]);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [trustOptions, setTrustOptions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTrustId, setSelectedTrustId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [appliedSearchTerm, setAppliedSearchTerm] = useState("");
  const [appliedTrustId, setAppliedTrustId] = useState("");
  const [appliedStatus, setAppliedStatus] = useState("ALL");
  const [appliedFromDate, setAppliedFromDate] = useState("");
  const [appliedToDate, setAppliedToDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingAction, setEditingAction] = useState(null);
  const [returnToListAfterForm, setReturnToListAfterForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConclusion, setDeleteConclusion] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const getItemId = (item) => item?.id ?? item?.supportIssueId ?? null;
  const getItemIssue = (item) => item?.description1 ?? item?.issue ?? "";
  const getItemAction = (item) => item?.description2 ?? item?.action ?? "";
  const getItemInterface = (item) =>
    item?.interface_name ?? item?.interfaceName ?? "";
  const getItemTrustId = (item) => item?.trust_id ?? item?.trustId ?? "";
  const getItemStatus = (item) =>
    item?.isDeleted ? "COMPLETE" : "ACTIVE";
  const getItemStatusLabel = (item) =>
    getItemStatus(item) === "COMPLETE" ? "Completed" : "Active";
  const getItemFinalConclusion = (item) =>
    item?.finalConclusion ?? item?.final_conclusion ?? "";
  const getItemCreatedOn = (item) =>
    item?.createdAt ?? item?.created_at ?? item?.createdOn ?? item?.date ?? "";
  const getItemUpdatedOn = (item) =>
    item?.updatedAt ?? item?.updated_at ?? item?.updatedOn ?? "";
  const getPlainText = (value) => {
    if (!value) return "";

    const tempElement = document.createElement("div");
    tempElement.innerHTML = String(value);

    return (tempElement.textContent || tempElement.innerText || "").trim();
  };
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
      " " +
      [
        pad(date.getHours()),
        pad(date.getMinutes()),
        pad(date.getSeconds()),
      ].join(":");
  };

  const getTrustName = (trustId) => {
    const trust = trustOptions.find(
      (t) => String(t.id) === String(trustId)
    );
    return trust ? trust.name : "-";
  };

  const allowedTrustIds = useMemo(() => {
    const trustIds =
      userProfile?.trusts
        ?.map((trust) => Number(trust?.id))
        .filter((id) => Number.isInteger(id)) || [];

    return Array.from(new Set(trustIds));
  }, [userProfile]);

  const hasTrustRestriction = allowedTrustIds.length > 0;

  useEffect(() => {
    if (isDetailView) {
      fetchIssueDetails();
      return;
    }

    fetchActions();
  }, [issueId, isDetailView]);

  useEffect(() => {
    if (
      selectedTrustId &&
      hasTrustRestriction &&
      !allowedTrustIds.includes(Number(selectedTrustId))
    ) {
      setSelectedTrustId("");
    }

    if (
      appliedTrustId &&
      hasTrustRestriction &&
      !allowedTrustIds.includes(Number(appliedTrustId))
    ) {
      setAppliedTrustId("");
    }
  }, [
    allowedTrustIds,
    appliedTrustId,
    hasTrustRestriction,
    selectedTrustId,
  ]);

  const fetchActions = async () => {
    try {
      setLoading(true);
      setError("");
      const [activeRes, deletedRes, trustRes] = await Promise.all([
        getSupportIssues(false),
        getSupportIssues(true),
        getTrusts(),
      ]);

      const combinedItems = [
        ...(activeRes.data || []),
        ...(deletedRes.data || []),
      ];

      const uniqueItems = Array.from(
        new Map(
          combinedItems.map((item, index) => [
            getItemId(item) ?? `idx-${index}`,
            item,
          ])
        ).values()
      );

      const nextTrustOptions = (trustRes.data || []).filter((trust) =>
        !hasTrustRestriction || allowedTrustIds.includes(Number(trust.id))
      );

      const nextQaData = uniqueItems.filter((item) =>
        !hasTrustRestriction ||
        allowedTrustIds.includes(Number(getItemTrustId(item)))
      );

      setQaData(nextQaData);
      setTrustOptions(nextTrustOptions);
    } catch (fetchError) {
      console.error("Error fetching actions:", fetchError);
      setError("Error loading data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const fetchIssueDetails = async () => {
    try {
      setLoading(true);
      setError("");

      const requests = [getSupportIssue(issueId)];

      if (trustOptions.length === 0) {
        requests.push(getTrusts());
      }

      const [issueRes, trustRes] = await Promise.all(requests);

      const issueData = issueRes?.data || null;

      if (!issueData) {
        setSelectedIssue(null);
        setError("Support action not found.");
        return;
      }

      if (trustRes) {
        const nextTrustOptions = (trustRes.data || []).filter((trust) =>
          !hasTrustRestriction || allowedTrustIds.includes(Number(trust.id))
        );
        setTrustOptions(nextTrustOptions);
      }

      if (
        hasTrustRestriction &&
        !allowedTrustIds.includes(Number(getItemTrustId(issueData)))
      ) {
        setSelectedIssue(null);
        setError("You do not have access to this support action.");
        return;
      }

      setSelectedIssue(issueData);
    } catch (fetchError) {
      console.error("Error loading action details:", fetchError);
      setSelectedIssue(null);
      setError("Unable to load action details.");
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    setEditingAction(null);
    setShowForm(false);

    if (returnToListAfterForm) {
      setReturnToListAfterForm(false);
      navigateToSupportList();
      return;
    }

    if (isDetailView) {
      fetchIssueDetails();
      return;
    }

    fetchActions();
  };

  const handleEdit = async (item) => {
    try {
      const id = getItemId(item);
      if (!id) return;

      const res = await getSupportIssue(id);
      setEditingAction(res.data || item);
      setShowForm(true);
    } catch (fetchError) {
      console.error("Error loading action details:", fetchError);
      setError("Unable to load action details.");
    }
  };

  const handleDelete = (item) => {
    if (!isAdminUser) return;

    const id = getItemId(item);
    if (!id) return;

    setDeleteTarget(item);
    setDeleteConclusion("");
    setDeleteError("");
  };

  const closeDeleteModal = () => {
    if (deleteLoading) return;

    setDeleteTarget(null);
    setDeleteConclusion("");
    setDeleteError("");
  };

  const confirmDelete = async () => {
    if (!isAdminUser) return;

    const id = getItemId(deleteTarget);
    const trimmedConclusion = deleteConclusion.trim();
    let isDeleted = false;

    if (!id) return;

    if (!trimmedConclusion) {
      setDeleteError("Final Conclusion is required");
      return;
    }

    try {
      setDeleteLoading(true);
      setDeleteError("");
      setError("");

      await deleteSupportIssue(id, {
        id,
        finalConclusion: trimmedConclusion,
      });
      isDeleted = true;
    } catch (deleteRequestError) {
      console.error("Delete failed:", deleteRequestError);
      setDeleteError(
        deleteRequestError.response?.data?.message ||
          deleteRequestError.response?.data?.error ||
          "Unable to delete action."
      );
    } finally {
      setDeleteLoading(false);

      if (isDeleted) {
        setDeleteTarget(null);
        setDeleteConclusion("");
        setDeleteError("");

        if (isDetailView) {
          fetchIssueDetails();
        } else {
          fetchActions();
        }
      }
    }
  };

  const handleSearchChange = (e) =>
    setSearchTerm(e.target.value.toLowerCase());

  const handleApplyFilters = () => {
    setAppliedSearchTerm(searchTerm);
    setAppliedTrustId(selectedTrustId);
    setAppliedStatus(selectedStatus);
    setAppliedFromDate(fromDate);
    setAppliedToDate(toDate);
  };

  const clearSearch = () => {
    setSearchTerm("");
    setSelectedTrustId("");
    setSelectedStatus("ALL");
    setFromDate("");
    setToDate("");
    setAppliedSearchTerm("");
    setAppliedTrustId("");
    setAppliedStatus("ALL");
    setAppliedFromDate("");
    setAppliedToDate("");
  };

  const downloadExcelFile = () => {
    if (!filteredData.length) return;

    const workbookRows = [
      [
        "S.No",
        "Issue ID",
        "Trust",
        "Status",
        "Interface Name",
        "Reason",
        "Action",
        "Final Conclusion",
        "Created On",
        "Updated On",
      ],
      ...filteredData.map((item, index) => [
        index + 1,
        getItemId(item) ?? "-",
        getTrustName(getItemTrustId(item)),
        getItemStatusLabel(item),
        getItemInterface(item) || "-",
        getItemIssue(item) || "-",
        getPlainText(getItemAction(item)) || "-",
        String(getItemFinalConclusion(item) || "").trim() || "-",
        formatDateTime(getItemCreatedOn(item)),
        formatDateTime(getItemUpdatedOn(item)),
      ]),
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(workbookRows);
    worksheet["!cols"] = [
      { wch: 8 },
      { wch: 12 },
      { wch: 18 },
      { wch: 14 },
      { wch: 28 },
      { wch: 24 },
      { wch: 50 },
      { wch: 24 },
      { wch: 22 },
      { wch: 22 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Support Actions");

    const safeInterfaceName = (interfaceName || "all-interfaces")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    XLSX.writeFile(
      workbook,
      `support-actions-${safeInterfaceName || "report"}.xlsx`
    );
  };

  const filteredData = qaData.filter((item) => {
    const itemDateValue = getItemCreatedOn(item);
    const itemDate = itemDateValue ? new Date(itemDateValue) : null;
    const from = appliedFromDate ? new Date(appliedFromDate) : null;
    const to = appliedToDate ? new Date(appliedToDate) : null;

    const matchesInterface = interfaceName
      ? getItemInterface(item).toLowerCase() === interfaceName.toLowerCase()
      : true;

    const matchesTrust =
      !appliedTrustId ||
      String(getItemTrustId(item)) === String(appliedTrustId);

    const matchesStatus =
      appliedStatus === "ALL" ||
      getItemStatus(item) === appliedStatus;

    const matchesSearch =
      getItemIssue(item).toLowerCase().includes(appliedSearchTerm) ||
      getItemAction(item).toLowerCase().includes(appliedSearchTerm) ||
      String(itemDateValue).toLowerCase().includes(appliedSearchTerm) ||
      getItemInterface(item).toLowerCase().includes(appliedSearchTerm);

    const matchesDate =
      (!from || (itemDate && itemDate >= from)) &&
      (!to || (itemDate && itemDate <= to));

    return (
      matchesInterface &&
      matchesTrust &&
      matchesStatus &&
      matchesSearch &&
      matchesDate
    );
  });

  if (showForm) {
    return (
      <AddActions
        initial={editingAction || {}}
        onSuccess={handleSuccess}
        onCancel={() => {
          if (returnToListAfterForm) {
            setReturnToListAfterForm(false);
            setEditingAction(null);
            setShowForm(false);
            navigateToSupportList();
            return;
          }

          setEditingAction(null);
          setShowForm(false);
        }}
      />
    );
  }

  if (isDetailView) {
    const detailStatus = selectedIssue ? getItemStatus(selectedIssue) : "ACTIVE";
    const detailStatusLabel = selectedIssue
      ? getItemStatusLabel(selectedIssue)
      : "Active";
    const detailConclusion = selectedIssue
      ? getItemFinalConclusion(selectedIssue)
      : "";

    return (
      <div className="content">
        <div className="actions-header">
          <h2>Support Actions</h2>

          <div className="actionback-toolbar">
            <div
              className="icon-btn"
              onClick={navigateToSupportList}
              title="Go Back"
            >
              <i className="fa-solid fa-less-than"></i>
            </div>

            {/* Add Action */}
            <button
              className="add-action-btn"
              onClick={() => {
                setEditingAction(null);
                setReturnToListAfterForm(true);
                setShowForm(true);
              }}
            >
              Add Action
            </button>
          </div>
        </div>

        {loading ? (
          <div className="actions-box">
            <p style={{ textAlign: "center", color: "#777" }}>Loading...</p>
          </div>
        ) : error ? (
          <div className="actions-box">
            <p className="error">{error}</p>
          </div>
        ) : selectedIssue ? (
          <div className="support-detail-card">
            <div className="support-detail-actions">
              {detailStatus !== "COMPLETE" && (
                <button
                  type="button"
                  className="edit-btn"
                  onClick={() => handleEdit(selectedIssue)}
                  title="Edit Action"
                >
                  <i className="ri-pencil-line"></i>
                </button>
              )}

              <button
                type="button"
                className="delete-btn"
                onClick={() => handleDelete(selectedIssue)}
                title={
                  detailStatus === "COMPLETE"
                    ? "Completed actions cannot be deleted"
                    : isAdminUser
                    ? "Delete Action"
                    : "Only admin can delete actions"
                }
                disabled={detailStatus === "COMPLETE" || !isAdminUser}
              >
                <i className="ri-delete-bin-6-line"></i>
              </button>
            </div>

            <div className="support-detail-row">
              <span className="support-detail-label-text">Issue ID:</span>
              <span>{getItemId(selectedIssue) ?? "-"}</span>
            </div>

            <div className="support-detail-row">
              <span className="support-detail-label-text">Trust:</span>
              <span>{getTrustName(getItemTrustId(selectedIssue))}</span>
            </div>

            <div className="support-detail-row">
              <span className="support-detail-label-text">Interface:</span>
              <span>{getItemInterface(selectedIssue) || "-"}</span>
            </div>

            <div className="support-detail-row">
              <span className="support-detail-label-text">Status:</span>
              <span
                className={`status-badge ${
                  detailStatus === "COMPLETE"
                    ? "status-complete"
                    : "status-active"
                }`}
              >
                {detailStatusLabel}
              </span>
            </div>

            <div className="support-detail-row">
              <span className="support-detail-label-text">Reason:</span>
              <span>{getItemIssue(selectedIssue) || "-"}</span>
            </div>

            <div className="support-detail-row support-detail-row-html">
              <span className="support-detail-label-text">Action:</span>
              <span
                className="support-detail-html"
                dangerouslySetInnerHTML={{
                  __html: getItemAction(selectedIssue) || "-",
                }}
              />
            </div>

            <div className="support-detail-row">
              <span className="support-detail-label-text">
                Final Conclusion:
              </span>
              <span>{String(detailConclusion || "").trim() || "-"}</span>
            </div>

            <div className="support-detail-row">
              <span className="support-detail-label-text">Created On:</span>
              <span>{formatDateTime(getItemCreatedOn(selectedIssue))}</span>
            </div>

            <div className="support-detail-row">
              <span className="support-detail-label-text">Updated On:</span>
              <span>{formatDateTime(getItemUpdatedOn(selectedIssue))}</span>
            </div>
          </div>
        ) : null}

        {deleteTarget && (
          <div className="modalOverlay" role="dialog" aria-modal="true">
            <div className="deleteModal">
              <h3>Final Conclusion</h3>
              <textarea
                value={deleteConclusion}
                onChange={(e) => {
                  setDeleteConclusion(e.target.value);
                  if (deleteError) {
                    setDeleteError("");
                  }
                }}
                placeholder="Enter final conclusion"
                rows="4"
              />

              {deleteError && <p className="modalError">{deleteError}</p>}

              <div className="modalActions">
                <button
                  type="button"
                  className="modalCancelBtn"
                  onClick={closeDeleteModal}
                  disabled={deleteLoading}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="modalDeleteBtn"
                  onClick={confirmDelete}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="content">
      <div className="actions-header">
        <h2>Support Actions List</h2>
      </div>

      <div className="actions-toolbar">
        <button
          type="button"
          className="download-action-btn"
          onClick={downloadExcelFile}
          disabled={loading || filteredData.length === 0}
        >
          <i className="ri-file-excel-2-line" aria-hidden="true"></i>
          Download Excel
        </button>
        
        <button
          className="add-action-btn"
          onClick={() => {
            setEditingAction(null);
            setReturnToListAfterForm(false);
            setShowForm(true);
          }}
        >
          Add Action
        </button>
      </div>

      <div className="filterWrapper">
        <div className="inputField filterBlock searchBlock">
          <i className="ri-search-line"></i>
          <input
            type="text"
            placeholder="Search here..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
          {searchTerm && (
            <i className="ri-close-line" onClick={clearSearch}></i>
          )}
        </div>

        <div className="trustFilter filterBlock">
          <label className="formLabel filterLabel">
            Trust:
            <select
              value={selectedTrustId}
              onChange={(e) => setSelectedTrustId(e.target.value)}
            >
              <option value="">All Trusts</option>
              {trustOptions.map((trust) => (
                <option key={trust.id} value={trust.id}>
                  {trust.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="statusFilter filterBlock">
          <label className="formLabel filterLabel">
            Status:
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="ALL">All</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETE">Completed</option>
            </select>
          </label>
        </div>

        <div className="dateRange filterBlock">
          <label className="formLabel filterLabel">
            From:
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </label>
          <label className="formLabel filterLabel">
            To:
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </label>
        </div>

        <div className="filterActions">
          <button
            type="button"
            className="search-action-btn"
            onClick={handleApplyFilters}
          >
            Search
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="actions-box">
        {loading ? (
          <p style={{ textAlign: "center", color: "#777" }}>Loading...</p>
        ) : filteredData.length === 0 ? (
          <p style={{ textAlign: "center", color: "#777" }}>
            No actions found
          </p>
        ) : (
          <div className="actions-table-wrapper">
            <table className="actions-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Issue ID</th>
                  <th>Trust</th>
                  <th>Status</th>
                  <th>Interface Name</th>
                  <th>Reason</th>
                  <th>Action</th>
                  <th>Final Conclusion</th>
                  <th>Created On</th>
                  <th>Updated On</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredData.map((item, index) => {
                  const itemStatus = getItemStatus(item);
                  const itemStatusLabel = getItemStatusLabel(item);
                  const finalConclusion = getItemFinalConclusion(item);

                  return (
                    <tr key={getItemId(item) ?? index}>
                      <td>{index + 1}</td>
                      <td>
                        {getItemId(item) ? (
                          <button
                            type="button"
                            className="issue-id-link"
                            onClick={() =>
                              navigate(
                                `${baseSupportActionsPath}/${getItemId(item)}`,
                                { state: location.state }
                              )
                            }
                          >
                            {getItemId(item)}
                          </button>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>{getTrustName(getItemTrustId(item))}</td>
                      <td>
                        <span
                          className={`status-badge ${
                            itemStatus === "COMPLETE"
                              ? "status-complete"
                              : "status-active"
                          }`}
                        >
                          {itemStatusLabel}
                        </span>
                      </td>
                      <td>{getItemInterface(item) || "-"}</td>
                      <td className="issue-cell">{getItemIssue(item) || "-"}</td>
                      <td className="action-html-cell">
                        <div
                          className="action-description"
                          dangerouslySetInnerHTML={{
                            __html: getItemAction(item) || "-",
                          }}
                        />
                      </td>
                      <td>{String(finalConclusion || "").trim() || "-"}</td>
                      <td>{formatDateTime(getItemCreatedOn(item))}</td>
                      <td>{formatDateTime(getItemUpdatedOn(item))}</td>
                      <td>
                        <div className="action-action-buttons">
                          {itemStatus !== "COMPLETE" ? (
                            <button
                              className="edit-btn"
                              onClick={() => handleEdit(item)}
                              title="Edit Action"
                            >
                              <i className="ri-pencil-line"></i>
                            </button>
                          ) : null}

                          <button
                            className="delete-btn"
                            onClick={() => handleDelete(item)}
                            title={
                              itemStatus === "COMPLETE"
                                ? "Completed actions cannot be deleted"
                                : isAdminUser
                                ? "Delete Action"
                                : "Only admin can delete actions"
                            }
                            disabled={
                              itemStatus === "COMPLETE" || !isAdminUser
                            }
                          >
                            <i className="ri-delete-bin-6-line"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {deleteTarget && (
        <div className="modalOverlay" role="dialog" aria-modal="true">
          <div className="deleteModal">
            <h3>Final Conclusion</h3>
            <textarea
              value={deleteConclusion}
              onChange={(e) => {
                setDeleteConclusion(e.target.value);
                if (deleteError) {
                  setDeleteError("");
                }
              }}
              placeholder="Enter final conclusion"
              rows="4"
            />

            {deleteError && <p className="modalError">{deleteError}</p>}

            <div className="modalActions">
              <button
                type="button"
                className="modalCancelBtn"
                onClick={closeDeleteModal}
                disabled={deleteLoading}
              >
                Cancel
              </button>

              <button
                type="button"
                className="modalDeleteBtn"
                onClick={confirmDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportActions;
