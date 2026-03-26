import React, { useState, useEffect } from "react";
import { createTrust, updateTrust } from "../api/trustService";
import "./TrustForm.css";

export default function TrustForm({ initial = {}, onSuccess, onCancel }) {

  const [trustName, setTrustName] = useState("");
  const [trustNameError, setTrustNameError] = useState("");
  const [description, setDescription] = useState("");
  const [startMonitoring, setStartMonitoring] = useState(true);
  const [statusError, setStatusError] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (initial?.id) {
      setTrustName(initial.name || "");
      setDescription(initial.description || "");
      setStartMonitoring(initial.isEnabled ?? true);
    }
  }, [initial]);

  const resetMessages = () => {
    setError("");
    setSuccess("");
    setTrustNameError("");
    setStatusError("");
  };

  const validate = () => {
    let valid = true;

    if (!trustName.trim()) {
      setTrustNameError("Trust name is required.");
      valid = false;
    }

    if (typeof startMonitoring !== "boolean") {
      setStatusError("Please select YES or NO.");
      valid = false;
    }

    return valid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    resetMessages();

    if (!validate()) return;

    const payload = {
      name: trustName.trim(),
      description: description.trim(),
      isEnabled: startMonitoring,
    };

    try {
      setLoading(true);

      if (initial?.id) {
        await updateTrust(initial.id, payload);
        setSuccess("Trust updated successfully");
      } else {
        await createTrust(payload);
        setSuccess("Trust created successfully");
      }

      if (typeof onSuccess === "function") {
        onSuccess();
      }

      setTrustName("");
      setDescription("");
      setStartMonitoring(true);

    } catch (err) {
      console.error("API Error:", err);
      setError(err.response?.data?.message || "Failed to create trust");
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    trustName.trim().length > 0 && typeof startMonitoring === "boolean";

  return (
    <div className="content">
      <h2 className="form-title">
        {initial?.id ? "Edit Trust" : "Add Trust"}
      </h2>

      <div className="trust-actions">
         <div className="icon-btn" onClick={onCancel}>
           <i className="fa-solid fa-less-than"></i>
        </div>
        
        <button
          type="button"
          className="trust-list-btn"
          onClick={onCancel}
        >
          List of Trusts
        </button>
      </div>

      {error && <div className="form-msg form-error">{error}</div>}
      {success && <div className="form-msg form-success">{success}</div>}

      <form className="form" onSubmit={handleSubmit} noValidate>

        <label className="form-label">Trust name*</label>

        <input
          className={`form-input ${trustNameError ? "input-invalid" : ""}`}
          value={trustName}
          onChange={(e) => {
            setTrustName(e.target.value);
            if (trustNameError) setTrustNameError("");
          }}
          placeholder="Enter trust name"
        />

        {trustNameError && <p className="input-error">{trustNameError}</p>}

        <label className="form-label">Description</label>

        <textarea
          className="form-textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          placeholder="Enter description (optional)"
        />

        <label className="form-label">Status*</label>

        <div className="toggle-group">
          <button
            type="button"
            className={`toggle-btn yes ${startMonitoring ? "active" : ""}`}
            onClick={() => setStartMonitoring(true)}
          >
            YES
          </button>

          <button
            type="button"
            className={`toggle-btn no ${!startMonitoring ? "active" : ""}`}
            onClick={() => setStartMonitoring(false)}
          >
            NO
          </button>
        </div>

        {statusError && <p className="input-error">{statusError}</p>}

        <button
          className="btn"
          type="submit"
          disabled={loading || !isFormValid}
        >
          {loading ? "Saving..." : "Submit"}
        </button>

      </form>
    </div>
  );
}
