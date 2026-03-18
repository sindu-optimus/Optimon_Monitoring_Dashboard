import React, { useMemo, useState, useEffect } from "react";
import "./TrustForm.css";

const REASONS = ["Error", "Suspended", "Custom"];

export default function TrustSupportForm({
  trustData = [],
  initial = null,          
  onCancel,
  onSuccess,
}) {
  /* ===== STATE ===== */
  const [trustId, setTrustId] = useState("");
  const [interfaceName, setInterfaceName] = useState("");
  const [interfaceSearch, setInterfaceSearch] = useState("");
  const [showInterfaceList, setShowInterfaceList] = useState(false);
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");

  const [showInterfaceHint, setShowInterfaceHint] = useState(false);
  const [showReasonHint, setShowReasonHint] = useState(false);

  /* ===== INITIALIZE FOR EDIT ===== */
  useEffect(() => {
    if (initial?.id) {
      setTrustId(initial.trustId || "");
      setInterfaceName(initial.interfaceName || "");
      setInterfaceSearch(initial.interfaceName || "");

      const isPreset = REASONS.includes(initial.reason);
      setReason(isPreset ? initial.reason : "Custom");
      setCustomReason(isPreset ? "" : initial.reason);
    }
  }, [initial]);

  /* ===== TRUST LIST ===== */
  const trusts = useMemo(() => {
    const map = new Map();

    trustData.forEach((item) => {
      item.queueDetails?.forEach((q) => {
        if (q.trustId && q.trustName) {
          map.set(q.trustId, q.trustName);
        }
      });
    });

    return Array.from(map.entries()).map(([id, name]) => ({
      id,
      name,
    }));
  }, [trustData]);

  /* ===== INTERFACES ===== */
  const interfaces = useMemo(() => {
    const list = [];

    trustData.forEach((item) => {
      item.queueDetails?.forEach((q) => {
        if (
          String(q.trustId) === String(trustId) &&
          q.queueName &&
          q.queueName !== "No Pending Queues"
        ) {
          list.push(q.queueName);
        }
      });
    });

    return [...new Set(list)];
  }, [trustId, trustData]);

  const selectedTrustName =
    trusts.find((t) => String(t.id) === String(trustId))?.name || "";

  /* ===== VALIDATION ===== */
  const isFormValid =
    trustId &&
    interfaceName &&
    reason &&
    (reason !== "Custom" || customReason.trim());

  /* ===== SUBMIT ===== */
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    const payload = {
      id: initial?.id ?? Date.now(),   // ✅ SAFE
      trustId,
      trustName: selectedTrustName,
      interfaceName,
      reason: reason === "Custom" ? customReason : reason,
      createdOn: initial?.createdOn ?? new Date().toISOString(),
    };

    onSuccess(payload);
  };

  return (
    <div className="content">
      <div className="form-header">
        <div className="back-btn">
          <div className="icon-btn" onClick={onCancel}>
            <i className="fa-solid fa-less-than"></i>
          </div>
          <button className="add-user-btn" onClick={onCancel}>
              List of Trust Support
          </button>
        </div>
        <h2 className="form-title">Trust Support</h2>
      </div>

      <form className="form" onSubmit={handleSubmit} noValidate>
        {/* TRUST */}
        <label className="form-label">Select Trust*</label>
        <select
          className="form-input"
          value={trustId}
          onChange={(e) => {
            setTrustId(e.target.value);
            setInterfaceName("");
            setInterfaceSearch("");
            setShowInterfaceList(false);
            setReason("");
            setCustomReason("");
            setShowInterfaceHint(false);
            setShowReasonHint(false);
          }}
        >
          <option value="">Select trust</option>
          {trusts.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        {/* INTERFACE */}
        <label className="form-label">Select Interface*</label>

        <div
          className="autocomplete-wrapper"
          onClick={() => {
            if (!trustId) setShowInterfaceHint(true);
          }}
        >
          <input
            className="form-input"
            placeholder={
              trustId ? "Search & select interface" : "Select trust first"
            }
            value={interfaceSearch}
            disabled={!trustId}
            onFocus={() => trustId && setShowInterfaceList(true)}
            onChange={(e) => {
              setInterfaceSearch(e.target.value);
              setShowInterfaceList(true);
              setInterfaceName("");
            }}
          />

          {showInterfaceList && trustId && (
            <div className="autocomplete-list">
              {interfaces
                .filter((i) =>
                  i.toLowerCase().includes(interfaceSearch.toLowerCase())
                )
                .map((i) => (
                  <div
                    key={i}
                    className="autocomplete-item"
                    onClick={() => {
                      setInterfaceName(i);
                      setInterfaceSearch(i);
                      setShowInterfaceList(false);
                      setShowReasonHint(false);
                    }}
                  >
                    {i}
                  </div>
                ))}
            </div>
          )}
        </div>

        {showInterfaceHint && !trustId && (
          <p className="input-error">
            Please select Trust first to view interfaces
          </p>
        )}

        {/* REASON */}
        <label className="form-label">Reason*</label>
        <select
          className="form-input"
          value={reason}
          disabled={!trustId || !interfaceName}
          onChange={(e) => {
            setReason(e.target.value);
            setCustomReason("");
          }}
        >
          <option value="">Select reason</option>
          {REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        {showReasonHint && (!trustId || !interfaceName) && (
          <p className="input-error">
            Please select Trust and Interface first
          </p>
        )}

        {reason === "Custom" && (
          <>
            <label className="form-label">Custom Reason*</label>
            <input
              className="form-input"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
            />
          </>
        )}

        <button className="btn" type="submit" disabled={!isFormValid}>
          {initial?.id ? "Update" : "Submit"}   {/* ✅ SAFE */}
        </button>
      </form>
    </div>
  );
}
