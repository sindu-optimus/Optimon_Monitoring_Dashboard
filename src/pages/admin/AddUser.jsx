import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import SignUpForm from "../../components/SignUpForm";
import { getUsers, deleteUser } from "../../api/userService";
import "./AddUser.css";

export default function AddUser() {
  const [showForm, setShowForm] = useState(false);
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);

  const ROLE_LABELS = {
    1: "Admin",
    2: "Operator",
    3: "Developer",
    4: "Viewer",
  };

  useEffect(() => {
    fetchUsers();
  }, []);

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

  const downloadExcelFile = () => {
    if (!users.length) return;

    const workbookRows = [
      ["S.No", "Name", "Role", "Email", "Username", "Phone", "Trusts"],
      ...users.map((user, index) => [
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

      <div className="users-actions">
        <button
          type="button"
          className="download-user-btn"
          onClick={downloadExcelFile}
          disabled={users.length === 0}
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
            {users.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-message">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user, index) => (
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
