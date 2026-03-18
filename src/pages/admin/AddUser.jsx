import { useState, useEffect } from "react";
import SignUpForm from "../../components/SignUpForm";
import { getUsers, deleteUser } from "../../api/userService";
import "./AddUser.css";

export default function AddUser() {
  const [showForm, setShowForm] = useState(false);
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);

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
          className="add-user-btn"
          onClick={() => {
            setEditingUser(null);
            setShowForm(true);
          }}
        >
          Add User
        </button>
      </div>

      <div className="users-box">

        {users.length === 0 && (
          <p className="empty-message">
            No users found
          </p>
        )}

        {users.map((user, index) => (
          <div key={user.id} className="user-item">

            <div className="user-number">
              {index + 1}.
            </div>

            <div className="user-info">
              <p>
                <strong>Name:</strong> {user.firstName} {user.lastName}
              </p>

              <p><strong>Role:</strong> {user.roleId}</p>

              <p><strong>Email:</strong> {user.email}</p>

              <p><strong>Phone:</strong> {user.mobile}</p>

              <p><strong>Trusts:</strong> {getTrustNames(user)}</p>
            </div>

            <div className="action-buttons">

              <button
                className="edit-btn"
                onClick={() => handleEdit(user)}
              >
                <i className="ri-pencil-line"></i>
              </button>

              <button
                className="delete-btn"
                onClick={() => handleDelete(user.id)}
              >
                <i className="ri-delete-bin-6-line"></i>
              </button>

            </div>

          </div>
        ))}

      </div>
    </div>
  );
}
