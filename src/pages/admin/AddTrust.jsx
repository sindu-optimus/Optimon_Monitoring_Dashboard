import { useState, useEffect } from "react";
import TrustForm from "../../components/TrustForm";
import { getTrusts, deleteTrust } from "../../api/trustService";
import "./AddTrust.css";

export default function AddTrust() {
  const [showForm, setShowForm] = useState(false);
  const [trusts, setTrusts] = useState([]);
  const [editingTrust, setEditingTrust] = useState(null);

  useEffect(() => {
    fetchTrusts();
  }, []);

  const fetchTrusts = async () => {
    try {
      const res = await getTrusts();
      setTrusts(res.data);
    } catch (error) {
      console.error("Error fetching trusts:", error);
    }
  };

  const handleSuccess = () => {
    setEditingTrust(null);
    setShowForm(false);
    fetchTrusts();
  };

  const handleEdit = (trust) => {
    setEditingTrust(trust);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this trust?")) return;

    try {
      await deleteTrust(id);
      fetchTrusts();
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  if (showForm) {
    return (
      <TrustForm
        initial={editingTrust || {}}
        onSuccess={handleSuccess}
        onCancel={() => {
          setEditingTrust(null);
          setShowForm(false);
        }}
      />
    );
  }

  return (
    <div className="content">
      <div className="trust-header">
        <h2>Trusts List</h2>
      </div>

      <div className="trustForm-actions">
        <button
          className="add-btn"
          onClick={() => {
            setEditingTrust(null);
            setShowForm(true);
          }}
        >
          Add Trust
        </button>
      </div>

      <div className="trust-box">
        {trusts.length === 0 && (
          <p style={{ textAlign: "center", color: "#777" }}>
            No trusts found
          </p>
        )}

        {trusts.map((trust, index) => (
          <div key={trust.id} className="trust-item">
            <div className="trust-number">{index + 1}.</div>

            <div className="trust-info">
              <p><strong>Trust Name:</strong> {trust.name}</p>
              <p><strong>Description:</strong> {trust.description || "-"}</p>
              <p><strong>Status:</strong> {trust.isEnabled ? "YES" : "NO"}</p>
            </div>

            <div className="trust-action-buttons">
              <button
                className="edit-btn"
                onClick={() => handleEdit(trust)}
                title="Edit Trust"
              >
                <i className="ri-pencil-line"></i>
              </button>

              <button
                className="delete-btn"
                onClick={() => handleDelete(trust.id)}
                title="Delete Trust"
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