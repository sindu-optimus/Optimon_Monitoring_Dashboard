import { useEffect, useState } from "react";
import TrustSupportForm from "../../components/TrustSupportForm";
import "./TrustSupport.css";

export default function TrustSupport({ trustData = [] }) {
  const [showForm, setShowForm] = useState(false);
  const [supportList, setSupportList] = useState([]);
  const [editingItem, setEditingItem] = useState(null);

  /* ===== LOAD FROM LOCAL STORAGE ===== */
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("trustSupport") || "[]");
    setSupportList(stored);
  }, []);

  /* ===== SAVE TO LOCAL STORAGE ===== */
  const persist = (list) => {
    setSupportList(list);
    localStorage.setItem("trustSupport", JSON.stringify(list));
  };

  if (showForm) {
    return (
      <TrustSupportForm
        trustData={trustData}
        initial={editingItem}
        onCancel={() => {
          setShowForm(false);
          setEditingItem(null);
        }}
        onSuccess={(saved) => {
          const updated = editingItem
            ? supportList.map((i) =>
                i.id === saved.id ? saved : i
              )
            : [saved, ...supportList];

          persist(updated);
          setShowForm(false);
          setEditingItem(null);
        }}
      />
    );
  }

  return (
    <div className="content">
      <div className="trust-header">
        <h2>Trust Support List</h2>
      </div>

      <div className="trust-actions">
        <button
          className="add-trust-btn"
          onClick={() => {
            setEditingItem(null);
            setShowForm(true);
          }}
        >
          Add Support
        </button>
      </div>

      {supportList.length === 0 ? (
        <div className="empty-message">
          No support tickets created yet
        </div>
      ) : (
        <div className="trust-box">
          {supportList.map((item, index) => (
            <div key={item.id} className="trust-item">
              <div className="trust-number">{index + 1}.</div>

              <div className="trust-info">
                <p><strong>Trust name:</strong> {item.trustName}</p>
                <p><strong>Interface name:</strong> {item.interfaceName}</p>
                <p><strong>Reason:</strong> {item.reason}</p>
                <p>
                  <strong>Created on:</strong>{" "}
                  {new Date(item.createdOn).toLocaleString()}
                </p>
              </div>

              {/* EDIT */}
              <div className="action-buttons">
                <button
                  className="edit-btn"
                  onClick={() => {
                    setEditingItem(item);
                    setShowForm(true);
                  }}
                >
                  <i className="ri-pencil-line"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
