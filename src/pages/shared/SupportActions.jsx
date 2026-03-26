import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
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
  const { interfaceName = "" } = location.state || {};

  const [showForm, setShowForm] = useState(false);
  const [qaData, setQaData] = useState([]);
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
    fetchActions();
  }, []);

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

  const handleSuccess = () => {
    setEditingAction(null);
    setShowForm(false);
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
        fetchActions();
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
          setEditingAction(null);
          setShowForm(false);
        }}
      />
    );
  }

  return (
    <div className="content">
      <div className="actions-header">
        <h2>Support Actions List</h2>
      </div>

      <div className="actions-toolbar">
        <button
          className="add-action-btn"
          onClick={() => {
            setEditingAction(null);
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
          filteredData.map((item, index) => (
            <div key={getItemId(item) ?? index} className="action-item">
              <div className="action-number">{index + 1}.</div>

              <div className="action-info">
                {/* <p><strong>Trust ID:</strong> {getItemTrustId(item) || "-"}</p> */}
                <p><strong>Trust:</strong> {getTrustName(getItemTrustId(item))}</p>
                <p><strong>Status:</strong> {getItemStatusLabel(item)}</p>
                <p><strong>Interface Name:</strong> {getItemInterface(item) || "-"}</p>
                <p><strong>Issue:</strong> {getItemIssue(item) || "-"}</p>
                <div className="action-line">
                  <p><strong>Action:</strong></p>
                  <div
                    className="action-description"
                    dangerouslySetInnerHTML={{ __html: getItemAction(item) || "-" }}
                  />
                </div>
                {String(getItemFinalConclusion(item) || "").trim() && (
                  <p>
                    <strong>Final Conclusion:</strong>{" "}
                    {getItemFinalConclusion(item)}
                  </p>
                )}
                <p><strong>Created On:</strong> {formatDateTime(getItemCreatedOn(item))}</p>
                <p><strong>Updated On:</strong> {formatDateTime(getItemUpdatedOn(item))}</p>
              </div>

              {getItemStatus(item) !== "COMPLETE" && (
                <div className="action-action-buttons">
                  <button
                    className="edit-btn"
                    onClick={() => handleEdit(item)}
                    title="Edit Action"
                  >
                    <i className="ri-pencil-line"></i>
                  </button>

                  <button
                    className="delete-btn"
                    onClick={() => handleDelete(item)}
                    title={
                      isAdminUser
                        ? "Delete Action"
                        : "Only admin can delete actions"
                    }
                    disabled={!isAdminUser}
                  >
                    <i className="ri-delete-bin-6-line"></i>
                  </button>
                </div>
              )}
            </div>
          ))
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
