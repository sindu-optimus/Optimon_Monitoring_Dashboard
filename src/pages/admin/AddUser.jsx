import { useState, useEffect, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import SignUpForm from "../../components/SignUpForm";
import { getUsers, deleteUser } from "../../api/userService";
import { getTrusts } from "../../api/trustService";
import { filterTrustsByAccess } from "../../utils/trustAccess";
import "./AddUser.css";

export default function AddUser({ userProfile = null }) {
  const ALL_TRUST_LABEL = "All";
  const [showForm, setShowForm] = useState(false);
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [trustOptions, setTrustOptions] = useState([]);
  const [selectedTrusts, setSelectedTrusts] = useState([]);
  const [isTrustDropdownOpen, setIsTrustDropdownOpen] = useState(false);
  const trustDropdownRef = useRef(null);

  const ROLE_LABELS = {
    1: "Admin",
    2: "Operator",
    3: "Developer",
    4: "Viewer",
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    let isActive = true;

    const fetchTrustOptions = async () => {
      try {
        const res = await getTrusts();
        if (!isActive) return;

        setTrustOptions(
          filterTrustsByAccess(res.data || [], userProfile).map((trust) => ({
            id: trust.id,
            label: trust.name,
          }))
        );
      } catch (error) {
        console.error("Error fetching trusts:", error);
      }
    };

    fetchTrustOptions();

    return () => {
      isActive = false;
    };
  }, [userProfile]);

  useEffect(() => {
    setSelectedTrusts((prev) => {
      const allowedTrustLabels = trustOptions.map((trust) => trust.label);
      const nextSelectedTrusts = prev.filter(
        (trust) =>
          trust === ALL_TRUST_LABEL || allowedTrustLabels.includes(trust)
      );

      if (
        nextSelectedTrusts.includes(ALL_TRUST_LABEL) &&
        allowedTrustLabels.length > 0 &&
        nextSelectedTrusts.length !== allowedTrustLabels.length + 1
      ) {
        return [ALL_TRUST_LABEL, ...allowedTrustLabels];
      }

      return nextSelectedTrusts;
    });
  }, [trustOptions]);

  useEffect(() => {
    if (!isTrustDropdownOpen) return;

    const handleClickOutside = (event) => {
      if (
        trustDropdownRef.current &&
        !trustDropdownRef.current.contains(event.target)
      ) {
        setIsTrustDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isTrustDropdownOpen]);

  const fetchUsers = async () => {
    try {
      const res = await getUsers();
      setUsers(res.data);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const handleSuccess = () => {
    setEditingUser(null);
    setShowForm(false);
    fetchUsers();
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;

    try {
      await deleteUser(id);
      fetchUsers();
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const getTrustNames = (user) =>
    user?.trusts?.map((trust) => trust.name).filter(Boolean).join(", ") || "None";
  const getRoleLabel = (user) =>
    user?.role ?? ROLE_LABELS[user?.roleId] ?? user?.roleId ?? "-";
  const allTrustLabels = trustOptions.map((trust) => trust.label);
  const selectedTrustLabels = selectedTrusts.includes(ALL_TRUST_LABEL)
    ? allTrustLabels
    : selectedTrusts;

  const trustDisplayValue =
    selectedTrustLabels.length === 0
      ? "Select trusts"
      : selectedTrusts.includes(ALL_TRUST_LABEL)
        ? "All trusts selected"
        : selectedTrustLabels.join(", ");

  const handleTrustToggle = (trustLabel) => {
    let nextValues;

    if (trustLabel === ALL_TRUST_LABEL) {
      const allSelected = selectedTrusts.includes(ALL_TRUST_LABEL);
      nextValues = allSelected ? [] : [ALL_TRUST_LABEL, ...allTrustLabels];
    } else {
      const selectedWithoutAll = selectedTrusts.filter(
        (trust) => trust !== ALL_TRUST_LABEL
      );
      const isSelected = selectedWithoutAll.includes(trustLabel);

      nextValues = isSelected
        ? selectedWithoutAll.filter((trust) => trust !== trustLabel)
        : [...selectedWithoutAll, trustLabel];

      if (nextValues.length === allTrustLabels.length && allTrustLabels.length > 0) {
        nextValues = [ALL_TRUST_LABEL, ...allTrustLabels];
      }
    }

    setSelectedTrusts(nextValues);
  };

  const filteredUsers = useMemo(() => {
    if (selectedTrustLabels.length === 0) {
      return users;
    }

    const selectedSet = new Set(selectedTrustLabels);

    return users.filter((user) =>
      (user?.trusts || []).some((trust) => selectedSet.has(trust?.name))
    );
  }, [selectedTrustLabels, users]);

  const downloadExcelFile = () => {
    if (!filteredUsers.length) return;

    const workbookRows = [
      ["S.No", "Name", "Role", "Email", "Username", "Phone", "Trusts"],
      ...filteredUsers.map((user, index) => [
        index + 1,
        `${user.firstName || ""} ${user.lastName || ""}`.trim() || "-",
        getRoleLabel(user),
        user.email || "-",
        user.username || "-",
        user.mobile ?? user.phone ?? "-",
        getTrustNames(user),
      ]),
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(workbookRows);
    worksheet["!cols"] = [
      { wch: 8 },
      { wch: 22 },
      { wch: 14 },
      { wch: 28 },
      { wch: 22 },
      { wch: 16 },
      { wch: 36 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Users");
    XLSX.writeFile(workbook, "users-list.xlsx");
  };

  if (showForm) {
    return (
      <SignUpForm
        initial={editingUser || {}}
        availableTrusts={trustOptions}
        onSuccess={handleSuccess}
        onCancel={() => {
          setEditingUser(null);
          setShowForm(false);
        }}
      />
    );
  }

  return (
    <div className="content">

      <div className="users-header">
        <h2>List of Users</h2>
      </div>

      <div className="users-toolbar">
        <div className="users-filter-group">
          <label className="users-filter-label">Trust Selection</label>
          <div className="multiSelect users-trust-filter" ref={trustDropdownRef}>
            <button
              type="button"
              className="multiSelectTrigger"
              onClick={() => setIsTrustDropdownOpen((prev) => !prev)}
              aria-expanded={isTrustDropdownOpen}
            >
              <span className={selectedTrustLabels.length === 0 ? "placeholder" : ""}>
                {trustDisplayValue}
              </span>
              <i
                className={`ri-arrow-down-s-line multiSelectArrow ${
                  isTrustDropdownOpen ? "open" : ""
                }`}
              />
            </button>

            {isTrustDropdownOpen && (
              <div className="multiSelectMenu">
                <label className="multiSelectOption" key={ALL_TRUST_LABEL}>
                  <input
                    type="checkbox"
                    checked={selectedTrusts.includes(ALL_TRUST_LABEL)}
                    onChange={() => handleTrustToggle(ALL_TRUST_LABEL)}
                  />
                  <span>{ALL_TRUST_LABEL}</span>
                </label>

                {allTrustLabels.map((trust) => (
                  <label className="multiSelectOption" key={trust}>
                    <input
                      type="checkbox"
                      checked={selectedTrustLabels.includes(trust)}
                      onChange={() => handleTrustToggle(trust)}
                    />
                    <span>{trust}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="users-actions">
          <button
            type="button"
            className="download-user-btn"
            onClick={downloadExcelFile}
            disabled={filteredUsers.length === 0}
          >
            <i className="ri-file-excel-2-line" aria-hidden="true"></i>
            Download Excel
          </button>

          <button
            className="add-btn"
            onClick={() => {
              setEditingUser(null);
              setShowForm(true);
            }}
          >
            Add User
          </button>
        </div>
      </div>

      <div className="users-table-wrap">
        <table className="users-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Name</th>
              <th>Role</th>
              <th>Email</th>
              <th>Username</th>
              <th>Phone</th>
              <th>Trusts</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-message">
                  No users found
                </td>
              </tr>
            ) : (
              filteredUsers.map((user, index) => (
                <tr key={user.id}>
                  <td>{index + 1}</td>
                  <td>{`${user.firstName || ""} ${user.lastName || ""}`.trim() || "-"}</td>
                  <td>{getRoleLabel(user)}</td>
                  <td>{user.email || "-"}</td>
                  <td>{user.username || "-"}</td>
                  <td>{user.mobile ?? user.phone ?? "-"}</td>
                  <td>{getTrustNames(user)}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="edit-btn"
                        onClick={() => handleEdit(user)}
                        title="Edit User"
                      >
                        <i className="ri-pencil-line"></i>
                      </button>

                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(user.id)}
                        title="Delete User"
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
      </div>
    </div>
  );
}
