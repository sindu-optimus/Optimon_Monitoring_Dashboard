import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import * as XLSX from "xlsx";
import AddActions from "../../components/AddActions";
import { getTrusts } from "../../api/trustService";
import {
  filterTrustsByAccess,
  getAllowedTrustIds,
} from "../../utils/trustAccess";
import {
  deleteSupportIssue,
  getSupportIssue,
  getSupportIssues,
} from "../../api/supportService";
import "./SupportActions.css";

const SUPPORT_ACTION_LOOKBACK_DAYS = 7;
const SUPPORT_ACTION_DEFAULT_PAGE_SIZE = 5;
const SUPPORT_ACTION_PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

const getItemId = (item) => item?.id ?? item?.supportIssueId ?? null;
const getItemIssue = (item) => item?.description1 ?? item?.issue ?? "";
const getItemAction = (item) => item?.description2 ?? item?.action ?? "";
const getItemInterface = (item) =>
  item?.interface_name ?? item?.interfaceName ?? "";
const getItemTrustId = (item) => item?.trust_id ?? item?.trustId ?? "";
const getItemStatus = (item) => (item?.isDeleted ? "COMPLETE" : "ACTIVE");
const getItemStatusLabel = (item) =>
  getItemStatus(item) === "COMPLETE" ? "Completed" : "Active";
const getItemFinalConclusion = (item) =>
  item?.finalConclusion ?? item?.final_conclusion ?? "";
const getItemCreatedOn = (item) =>
  item?.createdAt ?? item?.created_at ?? item?.createdOn ?? item?.date ?? "";
const getItemUpdatedOn = (item) =>
  item?.updatedAt ?? item?.updated_at ?? item?.updatedOn ?? "";

const formatDateInputValue = (date) => {
  const pad = (part) => String(part).padStart(2, "0");

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-");
};

const parseDateInputValue = (value) => {
  if (!value) return null;

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getTodayDateInputValue = () => formatDateInputValue(new Date());

const getEndOfDay = (date) => {
  if (!date) return null;

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  return endOfDay;
};

const addMonthsToDate = (date, months) => {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + months);
  return nextDate;
};

const getMaxToDateValue = (fromDateValue) => {
  const today = parseDateInputValue(getTodayDateInputValue());
  const from = parseDateInputValue(fromDateValue);

  if (!today || !from) {
    return getTodayDateInputValue();
  }

  const oneMonthFromStart = addMonthsToDate(from, 1);
  const maxTo = oneMonthFromStart < today ? oneMonthFromStart : today;

  return formatDateInputValue(maxTo);
};

const getPastDaysCutoff = (days) => {
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (days - 1));
  return cutoff;
};

const isWithinPastDays = (value, days) => {
  if (!value) return false;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  return date >= getPastDaysCutoff(days);
};

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

const buildSearchText = (item) =>
  [
    getItemIssue(item),
    getPlainText(getItemAction(item)),
    getItemCreatedOn(item),
    getItemInterface(item),
  ]
    .join(" ")
    .toLowerCase();

const getSupportIssueRows = (responseData) => {
  if (Array.isArray(responseData)) return responseData;

  if (Array.isArray(responseData?.content)) return responseData.content;
  if (Array.isArray(responseData?.data)) return responseData.data;
  if (Array.isArray(responseData?.items)) return responseData.items;
  if (Array.isArray(responseData?.supportIssues)) {
    return responseData.supportIssues;
  }

  return [];
};

const getSupportIssuePagination = (
  responseData,
  requestedPage,
  rowCount,
  pageSize = SUPPORT_ACTION_DEFAULT_PAGE_SIZE
) => {
  const totalPages =
    responseData?.totalPages ??
    responseData?.page?.totalPages ??
    responseData?.pagination?.totalPages ??
    null;
  const totalItems =
    responseData?.totalElements ??
    responseData?.totalItems ??
    responseData?.page?.totalElements ??
    responseData?.pagination?.totalItems ??
    null;
  const responsePage =
    responseData?.number ??
    responseData?.page?.number ??
    responseData?.pageNumber ??
    responseData?.page ??
    responseData?.pageable?.pageNumber ??
    responseData?.pagination?.page ??
    requestedPage;

  return {
    page: Number.isFinite(Number(responsePage))
      ? Number(responsePage)
      : requestedPage,
    totalPages: Number.isFinite(Number(totalPages))
      ? Number(totalPages)
      : null,
    totalItems: Number.isFinite(Number(totalItems))
      ? Number(totalItems)
      : null,
    hasNext:
      typeof responseData?.last === "boolean"
        ? !responseData.last
        : rowCount === pageSize,
  };
};

const uniqueIssuesById = (items) =>
  Array.from(
    new Map(
      items.map((item, index) => [getItemId(item) ?? `idx-${index}`, item])
    ).values()
  );

const isAllowedForUser = (item, hasTrustRestriction, allowedTrustIds) => {
  if (!hasTrustRestriction) return true;

  return allowedTrustIds.includes(Number(getItemTrustId(item)));
};

const validateDateFilters = ({ fromDate, toDate, todayDateValue }) => {
  const today = parseDateInputValue(todayDateValue);
  const from = parseDateInputValue(fromDate);
  const to = parseDateInputValue(toDate || todayDateValue);

  if (toDate && !fromDate) {
    return { error: "Select a From date to filter by date range." };
  }

  if ((from && from > today) || (to && to > today)) {
    return { error: "Future dates cannot be selected." };
  }

  if (from && to && from > to) {
    return { error: "From date cannot be after To date." };
  }

  if (from && to && to > addMonthsToDate(from, 1)) {
    return { error: "Please select a date range of one month or less." };
  }

  return {
    error: "",
    appliedToDate: fromDate && !toDate ? todayDateValue : toDate,
  };
};

const buildSupportActionQueryParams = ({
  fromDate,
  toDate,
  trustId,
  status,
  todayDateValue,
  page = 0,
  size = SUPPORT_ACTION_DEFAULT_PAGE_SIZE,
}) => {
  const params = { page, size };

  if (fromDate) {
    params.fromDate = fromDate;
    params.toDate = toDate || todayDateValue;
  }

  if (trustId) {
    params.trustId = trustId;
  }

  if (status === "ACTIVE") {
    params.isDeleted = false;
  } else if (status === "COMPLETE") {
    params.isDeleted = true;
  }

  return params;
};

const matchesAppliedFilters = (item, filters) => {
  const {
    interfaceName,
    searchTerm,
    trustId,
    status,
    fromDate,
    toDate,
  } = filters;

  const createdOn = getItemCreatedOn(item);
  const itemDate = createdOn ? new Date(createdOn) : null;
  const from = parseDateInputValue(fromDate);
  const to = getEndOfDay(parseDateInputValue(toDate));
  const hasDateFilter = Boolean(fromDate || toDate);

  const checks = {
    recentEnough:
      hasDateFilter ||
      isWithinPastDays(createdOn, SUPPORT_ACTION_LOOKBACK_DAYS),
    interfaceMatches:
      !interfaceName ||
      getItemInterface(item).toLowerCase() === interfaceName.toLowerCase(),
    trustMatches: !trustId || String(getItemTrustId(item)) === String(trustId),
    // statusMatches: status === "ALL" || getItemStatus(item) === status,
    searchMatches: buildSearchText(item).includes(searchTerm),
    dateMatches:
      (!from || (itemDate && itemDate >= from)) &&
      (!to || (itemDate && itemDate <= to)),
  };

  return Object.values(checks).every(Boolean);
};

const sortActiveNewestFirst = (a, b) => {
  const aStatus = getItemStatus(a);
  const bStatus = getItemStatus(b);

  if (aStatus !== bStatus) {
    return aStatus === "ACTIVE" ? -1 : 1;
  }

  const aTime = new Date(getItemCreatedOn(a)).getTime();
  const bTime = new Date(getItemCreatedOn(b)).getTime();
  const safeATime = Number.isNaN(aTime) ? 0 : aTime;
  const safeBTime = Number.isNaN(bTime) ? 0 : bTime;

  return safeBTime - safeATime;
};

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
  const [pageSize, setPageSize] = useState(SUPPORT_ACTION_DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [error, setError] = useState("");
  const [filterError, setFilterError] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(null);
  const [totalItems, setTotalItems] = useState(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [activeQueryParams, setActiveQueryParams] = useState({
    page: 0,
    size: SUPPORT_ACTION_DEFAULT_PAGE_SIZE,
  });
  const [editingAction, setEditingAction] = useState(null);
  const [returnToListAfterForm, setReturnToListAfterForm] = useState(false);
  const [closeTarget, setCloseTarget] = useState(null);
  const [closeConclusion, setCloseConclusion] = useState("");
  const [closeError, setCloseError] = useState("");
  const [closeLoading, setCloseLoading] = useState(false);

  const todayDateValue = getTodayDateInputValue();
  const toDateMaxValue = getMaxToDateValue(fromDate);

  const getTrustName = (trustId) => {
    const trust = trustOptions.find(
      (t) => String(t.id) === String(trustId)
    );
    return trust ? trust.name : "-";
  };

  const allowedTrustIds = useMemo(() => {
    return getAllowedTrustIds(userProfile);
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

  const fetchActions = async (params = activeQueryParams) => {
    try {
      const requestParams = {
        page: 0,
        size: pageSize,
        ...params,
      };
      const requestedPage = Number(requestParams.page) || 0;
      const requestedSize = Number(requestParams.size) || pageSize;

      setLoading(true);
      setError("");
      const [supportRes, trustRes] = await Promise.all([
        getSupportIssues(requestParams),
        getTrusts(),
      ]);

      const uniqueItems = uniqueIssuesById(getSupportIssueRows(supportRes.data));
      const pagination = getSupportIssuePagination(
        supportRes.data,
        requestedPage,
        uniqueItems.length,
        requestedSize
      );

      const nextTrustOptions = filterTrustsByAccess(
        trustRes.data || [],
        userProfile
      );

      const nextQaData = uniqueItems.filter((item) =>
        isAllowedForUser(item, hasTrustRestriction, allowedTrustIds)
      );

      setQaData(nextQaData);
      setTrustOptions(nextTrustOptions);
      setActiveQueryParams(requestParams);
      setCurrentPage(pagination.page);
      setTotalPages(pagination.totalPages);
      setTotalItems(pagination.totalItems);
      setHasNextPage(pagination.hasNext);
    } catch (fetchError) {
      console.error("Error fetching actions:", fetchError);
      setError("Error loading data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllActionsForExport = async () => {
    const baseParams = {
      ...activeQueryParams,
      page: 0,
      size: pageSize,
    };
    const allItems = [];
    let nextPage = 0;
    let shouldContinue = true;

    while (shouldContinue) {
      const response = await getSupportIssues({
        ...baseParams,
        page: nextPage,
      });
      const responseData = response.data;
      const pageItems = uniqueIssuesById(getSupportIssueRows(responseData));
      const pagination = getSupportIssuePagination(
        responseData,
        nextPage,
        pageItems.length,
        Number(baseParams.size) || pageSize
      );

      allItems.push(...pageItems);

      if (pagination.totalPages != null) {
        shouldContinue = nextPage < pagination.totalPages - 1;
      } else {
        shouldContinue = pagination.hasNext;
      }

      nextPage += 1;
    }

    return uniqueIssuesById(allItems).filter((item) =>
      isAllowedForUser(item, hasTrustRestriction, allowedTrustIds)
    );
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
        const nextTrustOptions = filterTrustsByAccess(
          trustRes.data || [],
          userProfile
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

  const handleCancelForm = () => {
    if (returnToListAfterForm) {
      setReturnToListAfterForm(false);
      setEditingAction(null);
      setShowForm(false);
      navigateToSupportList();
      return;
    }

    setEditingAction(null);
    setShowForm(false);
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

  const handleClose = (item) => {
    if (!isAdminUser) return;

    const id = getItemId(item);
    if (!id) return;

    setCloseTarget(item);
    setCloseConclusion("");
    setCloseError("");
  };

  const closeCloseModal = () => {
    if (closeLoading) return;

    setCloseTarget(null);
    setCloseConclusion("");
    setCloseError("");
  };

  const confirmClose = async () => {
    if (!isAdminUser) return;

    const id = getItemId(closeTarget);
    const trimmedConclusion = closeConclusion.trim();
    let isClosed = false;

    if (!id) return;

    if (!trimmedConclusion) {
      setCloseError("Final Conclusion is required");
      return;
    }

    try {
      setCloseLoading(true);
      setCloseError("");
      setError("");

      await deleteSupportIssue(id, {
        id,
        finalConclusion: trimmedConclusion,
      });
      isClosed = true;
    } catch (closeRequestError) {
      console.error("Close failed:", closeRequestError);
      setCloseError(
        closeRequestError.response?.data?.message ||
          closeRequestError.response?.data?.error ||
          "Unable to close action."
      );
    } finally {
      setCloseLoading(false);

      if (isClosed) {
        setCloseTarget(null);
        setCloseConclusion("");
        setCloseError("");

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
    const { error: nextFilterError, appliedToDate: nextAppliedToDate } =
      validateDateFilters({ fromDate, toDate, todayDateValue });

    if (nextFilterError) {
      setFilterError(nextFilterError);
      return;
    }

    setFilterError("");
    const nextQueryParams = buildSupportActionQueryParams({
      fromDate,
      toDate: nextAppliedToDate,
      trustId: selectedTrustId,
      status: selectedStatus,
      todayDateValue,
      page: 0,
      size: pageSize,
    });

    fetchActions(nextQueryParams);
    setAppliedSearchTerm(searchTerm);
    setAppliedTrustId(selectedTrustId);
    setAppliedStatus(selectedStatus);
    setAppliedFromDate(fromDate);
    setAppliedToDate(nextAppliedToDate);
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
    setFilterError("");
    fetchActions({ page: 0, size: pageSize });
  };

  const handlePageSizeChange = (e) => {
    const value = e.target.value;

    // allow empty while typing
    if (value === "") {
      setPageSize("");
      return;
    }

    const num = Number(value);

    setPageSize(num);

    // only call API if valid number
    if (num >= 1 && num <= 100) {
      fetchActions({
        ...activeQueryParams,
        page: 0,
        size: num,
      });
    }
  };

  const downloadExcelFile = async () => {
    if (loading || exportLoading) return;

    try {
      setExportLoading(true);
      setError("");

      const exportItems = (await fetchAllActionsForExport())
        .filter((item) => matchesAppliedFilters(item, appliedFilters))
        .sort(sortActiveNewestFirst);

      if (!exportItems.length) {
        return;
      }

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
        ...exportItems.map((item, index) => [
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
    } catch (downloadError) {
      console.error("Error downloading support actions:", downloadError);
      setError("Unable to download Excel. Please try again later.");
    } finally {
      setExportLoading(false);
    }
  };

  const appliedFilters = useMemo(
    () => ({
      interfaceName,
      searchTerm: appliedSearchTerm,
      trustId: appliedTrustId,
      status: appliedStatus,
      fromDate: appliedFromDate,
      toDate: appliedToDate,
    }),
    [
      appliedFromDate,
      appliedSearchTerm,
      appliedStatus,
      appliedToDate,
      appliedTrustId,
      interfaceName,
    ]
  );

  const filteredData = qaData.sort(sortActiveNewestFirst);

  const canGoPrevious = !loading && currentPage > 0;
  const canGoNext =
    !loading &&
    (totalPages != null ? currentPage < totalPages - 1 : hasNextPage);
  const displayPage = currentPage + 1;
  const displayTotalPages = totalPages ?? (hasNextPage ? "..." : displayPage);
  const showingFrom =
    filteredData.length > 0 ? currentPage * pageSize + 1 : 0;
  const showingTo =
    filteredData.length > 0
      ? currentPage * pageSize + filteredData.length
      : 0;

  const fetchPage = (nextPage) => {
    if (nextPage < 0) return;

    fetchActions({
      ...activeQueryParams,
      page: nextPage,
      size: pageSize,
    });
  };

  const handlePreviousPage = () => {
    if (!canGoPrevious) return;
    fetchPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (!canGoNext) return;
    fetchPage(currentPage + 1);
  };

  const renderCloseModal = () => {
    if (!closeTarget) return null;

    return (
      <div className="modalOverlay" role="dialog" aria-modal="true">
        <div className="closeModal">
          <h3>Final Conclusion</h3>
          <textarea
            value={closeConclusion}
            onChange={(e) => {
              setCloseConclusion(e.target.value);
              if (closeError) {
                setCloseError("");
              }
            }}
            placeholder="Enter final conclusion"
            rows="4"
          />

          {closeError && <p className="modalError">{closeError}</p>}

          <div className="modalActions">
            <button
              type="button"
              className="modalCancelBtn"
              onClick={closeCloseModal}
              disabled={closeLoading}
            >
              Cancel
            </button>

            <button
              type="button"
              className="modalCloseBtn"
              onClick={confirmClose}
              disabled={closeLoading}
            >
              {closeLoading ? "Closing..." : "Close"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (showForm) {
    return (
      <AddActions
        initial={editingAction || {}}
        userProfile={userProfile}
        onSuccess={handleSuccess}
        onCancel={handleCancelForm}
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
                className="close-btn"
                onClick={() => handleClose(selectedIssue)}
                title={
                  detailStatus === "COMPLETE"
                    ? "Completed actions cannot be closed"
                    : isAdminUser
                    ? "Close Action"
                    : "Only admin can close actions"
                }
                disabled={detailStatus === "COMPLETE" || !isAdminUser}
              >
                <i className="ri-close-circle-line"></i>
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

        {renderCloseModal()}
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
          disabled={loading || exportLoading || filteredData.length === 0}
        >
          <i className="ri-file-excel-2-line" aria-hidden="true"></i>
          {exportLoading ? "Downloading..." : "Download Excel"}
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
              max={todayDateValue}
              onChange={(e) => {
                const nextFromDate = e.target.value;
                const nextMaxToDate = getMaxToDateValue(nextFromDate);

                setFromDate(nextFromDate);

                if (toDate && toDate > nextMaxToDate) {
                  setToDate(nextMaxToDate);
                }

                if (filterError) {
                  setFilterError("");
                }
              }}
            />
          </label>
          <label className="formLabel filterLabel">
            To:
            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              max={toDateMaxValue}
              onChange={(e) => {
                setToDate(e.target.value);

                if (filterError) {
                  setFilterError("");
                }
              }}
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

      {filterError && <p className="error">{filterError}</p>}
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
                      <td>{currentPage * pageSize + index + 1}</td>
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

                            {itemStatus === "COMPLETE" ? (
                              <span className="closed-text">Closed</span>
                            ) : (
                              <button
                                className="close-btn"
                                onClick={() => handleClose(item)}
                                title={
                                  isAdminUser
                                    ? "Close Action"
                                    : "Only admin can close actions"
                                }
                              >
                                <i className="ri-close-large-line"></i>
                              </button>
                            )}
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

      <div className="paginationControls">
        <div className="paginationShowing">
          Showing {showingFrom} to {showingTo}
        </div>

        <div className="paginationPages">
          <label className="formLabel filterLabel pageSizeWrapper">
            Page Size:
            <input
              type="number"
              className="pageSizeInput"
              value={pageSize}
              min={1}
              // max={50}
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
            Page {displayPage} of {displayTotalPages}
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

      {renderCloseModal()}
    </div>
  );
};

export default SupportActions;
