import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import SupportCommsForm from "../../components/SupportCommsForm";
import SearchBar from "../../components/SearchBar";
import {
  createSupportContact,
  deleteSupportContact,
  getSupportContacts,
  getSupportContactsByDirection,
  updateSupportContact,
} from "../../api/supportContactsService";
import { getTrusts } from "../../api/trustService";
import { filterTrustsByAccess } from "../../utils/trustAccess";
import "./AddTrust.css";
import "./SupportComms.css";

const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_TRUST_NAME = "LNWUH";
const DIRECTION_OPTIONS = {
  OUTBOUND: "OUTBOUND",
  INBOUND: "INBOUND",
};

const getListFromApiResponse = (response) => {
  const data = response?.data ?? response;
  const list =
    data?.data ??
    data?.content ??
    data?.items ??
    data?.supportContacts ??
    data?.supportContactList ??
    data;

  return Array.isArray(list) ? list : [];
};

const normalizeDirection = (value) => {
  const upperValue = String(value ?? "").trim().toUpperCase();

  if (upperValue === DIRECTION_OPTIONS.INBOUND || upperValue === "IDLE_TIME") {
    return DIRECTION_OPTIONS.INBOUND;
  }

  return DIRECTION_OPTIONS.OUTBOUND;
};

const normalizeEmails = (value) => {
  if (Array.isArray(value)) {
    return value.map((email) => String(email).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/[,\n;]+/)
      .map((email) => email.trim())
      .filter(Boolean);
  }

  return [];
};

const getTrustId = (item) =>
  item?.trustId ??
  item?.trust_id ??
  item?.trust?.id ??
  item?.trust?.trustId ??
  item?.interfaceTrustId;

const getTrustName = (item) =>
  item?.trustName ?? item?.trust_name ?? item?.trust?.name ?? "";

const getInterfaceId = (item) =>
  item?.interfaceId ??
  item?.interface_id ??
  item?.criticalInterfaceId ??
  item?.intefaceId ??
  item?.inboundReceiverId;

const getInterfaceName = (item) =>
  item?.interfaceName ??
  item?.interface_name ??
  item?.endpointName ??
  item?.queueName ??
  item?.serviceName ??
  item?.name ??
  item?.criticalInterfaceName ??
  item?.interface?.name ??
  "";

const getDepartmentValue = (item) =>
  item?.originatingSystemDepartment ??
  item?.originatingDepartment ??
  item?.originatingSystem ??
  item?.departmentThatFiled ??
  item?.department ??
  "";

const getContactNameValue = (item) =>
  item?.supportContactName ?? item?.supportName ?? item?.contactName ?? item?.name ?? "";

const getPhoneValue = (item) =>
  item?.telephoneMobile ??
  item?.telephone ??
  item?.mobile ??
  item?.phone ??
  item?.contactNumber ??
  "";

const getSupportEmailValue = (item) =>
  item?.supportEmails ??
  item?.supportEmail ??
  item?.emails ??
  item?.emailIds ??
  item?.email ??
  [];

const getUpdatedOnValue = (item) =>
  item?.updatedOn ??
  item?.updatedAt ??
  item?.modifiedOn ??
  item?.modifiedAt ??
  item?.lastUpdatedOn ??
  item?.lastUpdatedAt ??
  item?.createdOn ??
  item?.createdAt ??
  "";

const formatUpdatedOn = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const toSupportContactRow = (item, trustNameById) => {
  const direction = normalizeDirection(
    item?.direction ?? item?.type ?? item?.selectedDirection ?? item?.selectedType
  );
  const interfaceId = getInterfaceId(item);
  const trustId = getTrustId(item);
  const trustName =
    getTrustName(item) ||
    trustNameById.get(String(trustId)) ||
    "-";
  const supportEmails = normalizeEmails(getSupportEmailValue(item));

  return {
    id: item?.id ?? item?.supportContactId ?? `support-contact-${Date.now()}`,
    trustId,
    trustName,
    interfaceId,
    interfaceName: getInterfaceName(item) || "-",
    direction,
    originatingSystemDepartment: getDepartmentValue(item) || "-",
    supportContactName: getContactNameValue(item) || "-",
    telephoneMobile: getPhoneValue(item) || "-",
    supportEmails: supportEmails.length ? supportEmails.join(", ") : "-",
    updatedOn: formatUpdatedOn(getUpdatedOnValue(item)),
    supportEmailsList: supportEmails,
    rawItem: item,
  };
};

const buildSupportContactPayload = (payload) => {
  if (
    payload &&
    Object.prototype.hasOwnProperty.call(payload, "email") &&
    Object.prototype.hasOwnProperty.call(payload, "supportName")
  ) {
    return {
      trustId: Number(payload.trustId) || undefined,
      direction: String(payload.direction ?? ""),
      email: String(payload.email ?? ""),
      interfaceId: Number(payload.interfaceId) || 0,
      originatingSystem: String(payload.originatingSystem ?? ""),
      supportName: String(payload.supportName ?? ""),
      telephone: String(payload.telephone ?? ""),
    };
  }

  const supportEmails = normalizeEmails(payload?.supportEmails);

  return {
    trustId: Number(payload?.trustId) || undefined,
    interfaceId: Number(payload?.interfaceId ?? payload?.criticalInterfaceId) || 0,
    direction:
      normalizeDirection(payload?.direction ?? payload?.type) ===
      DIRECTION_OPTIONS.INBOUND
        ? "INBOUND"
        : "OUTBOUND",
    email: supportEmails.join(", "),
    supportName: payload?.supportContactName?.trim() || "",
    telephone: String(payload?.telephoneMobile ?? "").trim(),
    originatingSystem: payload?.originatingSystemDepartment?.trim() || "",
  };
};

export default function SupportComms({ userProfile = null }) {
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [trusts, setTrusts] = useState([]);
  const [selectedTrustId, setSelectedTrustId] = useState("");
  const [selectedDirection, setSelectedDirection] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [supportContacts, setSupportContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    let isActive = true;

    const loadTrusts = async () => {
      try {
        const trustResponse = await getTrusts();
        if (!isActive) return;

        const accessibleTrusts = filterTrustsByAccess(
          trustResponse.data || [],
          userProfile
        );

        setTrusts(accessibleTrusts);
      } catch (loadError) {
        if (!isActive) return;
        console.error("Error fetching trusts:", loadError);
        setTrusts([]);
        setError("Unable to load trusts.");
      }
    };

    loadTrusts();

    return () => {
      isActive = false;
    };
  }, [userProfile]);

  const loadSupportContacts = async () => {
    if (!selectedTrustId) {
      setSupportContacts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      let response;

      // If direction selected → call filtered API
      if (selectedDirection) {
        response = await getSupportContactsByDirection(
          selectedDirection,
          selectedTrustId
        );
      } else {
        // Default → get all
        response = await getSupportContacts(selectedTrustId);
      }

      setSupportContacts(getListFromApiResponse(response));
    } catch (error) {
      console.error("Error fetching support contacts:", error);
      setSupportContacts([]);
      setError("Unable to load support contacts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSupportContacts();
  }, [selectedDirection, selectedTrustId]);

  useEffect(() => {
    if (selectedTrustId || trusts.length === 0) {
      return;
    }

    const defaultTrust =
      trusts.find(
        (trust) =>
          String(trust.name ?? "").trim().toUpperCase() === DEFAULT_TRUST_NAME
      ) ?? trusts[0];

    setSelectedTrustId(String(defaultTrust.id));
  }, [selectedTrustId, trusts]);

  const allTableRows = useMemo(() => {
    const trustNameById = new Map(
      trusts.map((trust) => [String(trust.id), trust.name || "-"])
    );

    const searchText = searchValue.trim().toLowerCase();

    return supportContacts
      .map((item) => toSupportContactRow(item, trustNameById))
      .filter((item) => {
        const trustMatches = !selectedTrustId
          ? true
          : String(item.trustId) === String(selectedTrustId);
        // const directionMatches = !selectedDirection
        //   ? true
        //   : item.direction === selectedDirection;

        const searchableText = [
          item.trustName,
          item.direction,
          item.interfaceName,
          item.originatingSystemDepartment,
          item.supportContactName,
          item.telephoneMobile,
          item.supportEmails,
          item.updatedOn,
        ]
          .join(" ")
          .toLowerCase();

        return trustMatches && (!searchText || searchableText.includes(searchText));

      })
      .sort((a, b) => a.interfaceName.localeCompare(b.interfaceName))
      .map((item, index) => ({
        ...item,
        serialNo: index + 1,
      }));
  }, [searchValue, selectedDirection, selectedTrustId, supportContacts, trusts]);

  const totalPages = Math.max(1, Math.ceil(allTableRows.length / pageSize));
  const paginatedTableRows = useMemo(() => {
    const startIndex = currentPage * pageSize;
    return allTableRows.slice(startIndex, startIndex + pageSize);
  }, [allTableRows, currentPage, pageSize]);
  const paginationStart =
    allTableRows.length === 0 ? 0 : currentPage * pageSize + 1;
  const paginationEnd = Math.min(
    currentPage * pageSize + paginatedTableRows.length,
    allTableRows.length
  );
  const canGoPrevious = !loading && currentPage > 0;
  const canGoNext = !loading && currentPage < totalPages - 1;
  const displayPage = currentPage + 1;

  useEffect(() => {
    setCurrentPage(0);
  }, [searchValue, selectedTrustId, selectedDirection]);

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

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this email row?")) {
      return;
    }

    try {
      await deleteSupportContact(id);
      await loadSupportContacts();
    } catch (deleteError) {
      console.error("Failed to delete support contact:", deleteError);
      setError("Failed to delete the support contact.");
    }
  };

  const handleSuccess = async (payload) => {
    const trustId = payload?.trustId ?? editingItem?.trustId ?? selectedTrustId;
    const requestPayload = {
      ...buildSupportContactPayload({
        ...payload,
        trustId,
      }),
      trustId: Number(trustId),
    };

    try {
      if (editingItem?.id) {
        await updateSupportContact(editingItem.id, requestPayload);
      } else {
        await createSupportContact(requestPayload);
      }

      await loadSupportContacts();
      setEditingItem(null);
      setShowForm(false);
    } catch (saveError) {
      console.error("Failed to save support contact:", saveError);
      throw saveError;
    }
  };

  const downloadExcelFile = () => {
    if (!allTableRows.length) return;

    const workbookRows = [
      [
        "S. No",
        "Trust Name",
        "Direction",
        "Interface Name",
        "Originating System/Department",
        "Support Contact Name",
        "Telephone/Mobile",
        "Support Emails",
        "Updated On",
      ],
      ...allTableRows.map((item) => [
        item.serialNo,
        item.trustName,
        item.direction,
        item.interfaceName,
        item.originatingSystemDepartment,
        item.supportContactName,
        item.telephoneMobile,
        item.supportEmails,
        item.updatedOn,
      ]),
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(workbookRows);
    worksheet["!cols"] = [
      { wch: 8 },
      { wch: 24 },
      { wch: 14 },
      { wch: 28 },
      { wch: 30 },
      { wch: 26 },
      { wch: 20 },
      { wch: 32 },
      { wch: 22 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Emails List");
    XLSX.writeFile(workbook, "emails-list.xlsx");
  };

  const supportCommsFormInitial = useMemo(
    () => ({
      id: editingItem?.id,
      trustId: editingItem?.trustId,
      trustName: editingItem?.trustName,
      direction: editingItem?.direction,
      interfaceId: editingItem?.interfaceId,
      criticalInterfaceId: editingItem?.interfaceId,
      interfaceName: editingItem?.interfaceName,
      originatingSystemDepartment:
        editingItem?.originatingSystemDepartment === "-"
          ? ""
          : editingItem?.originatingSystemDepartment,
      supportContactName:
        editingItem?.supportContactName === "-"
          ? ""
          : editingItem?.supportContactName,
      telephoneMobile:
        editingItem?.telephoneMobile === "-" ? "" : editingItem?.telephoneMobile,
      supportEmails:
        editingItem?.supportEmails === "-" ? "" : editingItem?.supportEmails,
    }),
    [editingItem]
  );

  if (showForm) {
    return (
      <SupportCommsForm
        initial={supportCommsFormInitial}
        onSuccess={handleSuccess}
        onCancel={() => {
          setEditingItem(null);
          setShowForm(false);
        }}
        userProfile={userProfile}
        disableIdentityFields={Boolean(editingItem)}
        trusts={trusts}
      />
    );
  }

  return (
    <div className="content">
      <div className="trust-header">
        <h2>Support Email Comms</h2>
      </div>

      <div className="emails-filter-row">
        <label className="emails-filter-label">
          Trust Selection
          <select
            value={selectedTrustId}
            className="emails-filter-select"
            onChange={(e) => setSelectedTrustId(e.target.value)}
          >
            {trusts.map((trust) => (
              <option key={trust.id} value={trust.id}>
                {trust.name}
              </option>
            ))}
          </select>
        </label>

        <label className="emails-filter-label">
          Directions
          <select
            value={selectedDirection}
            className="emails-filter-select"
            onChange={(e) => setSelectedDirection(e.target.value)}
          >
            <option value="">All Directions</option>
            <option value={DIRECTION_OPTIONS.OUTBOUND}>OUTBOUND</option>
            <option value={DIRECTION_OPTIONS.INBOUND}>INBOUND</option>
          </select>
        </label>

        <SearchBar
          className="emails-search"
          label="Search"
          value={searchValue}
          onChange={setSearchValue}
          placeholder="Search support contacts..."
        />

        <div className="emails-toolbar-actions">
          <button
            type="button"
            className="download-trust-btn"
            onClick={downloadExcelFile}
            disabled={allTableRows.length === 0}
          >
            <i className="ri-file-excel-2-line" aria-hidden="true"></i>
            Download Excel
          </button>

          <button
            className="add-btn"
            onClick={() => {
              setEditingItem(null);
              setShowForm(true);
            }}
          >
            Add Support Email
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="trust-table-wrap">
        {loading ? (
          <p className="emails-list-empty">Loading...</p>
        ) : (
          <table className="trust-table emails-table">
            <thead>
              <tr>
                <th>S. No</th>
                <th>Trust Name</th>
                <th>Direction</th>
                <th>Interface Name</th>
                <th>Originating System/Department</th>
                <th>Support Contact Name</th>
                <th>Telephone/Mobile</th>
                <th>Support Emails</th>
                <th>Updated On</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {allTableRows.length === 0 ? (
                <tr>
                  <td colSpan="10" className="trust-empty">
                    No support contacts found
                  </td>
                </tr>
              ) : (
                paginatedTableRows.map((item) => (
                  <tr key={item.id}>
                    <td>{item.serialNo}</td>
                    <td>{item.trustName}</td>
                    <td>{item.direction}</td>
                    <td>{item.interfaceName}</td>
                    <td>{item.originatingSystemDepartment}</td>
                    <td>{item.supportContactName}</td>
                    <td>{item.telephoneMobile}</td>
                    <td>{item.supportEmails}</td>
                    <td>{item.updatedOn}</td>
                    <td>
                      <div className="trust-action-buttons">
                        <button
                          className="edit-btn"
                          onClick={() => handleEdit(item)}
                          title="Edit Email"
                        >
                          <i className="ri-pencil-line"></i>
                        </button>

                        <button
                          className="delete-btn"
                          onClick={() => handleDelete(item.id)}
                          title="Delete Email"
                        >
                          <i className="ri-delete-bin-6-line"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {!loading && allTableRows.length > 0 && (
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
    </div>
  );
}
