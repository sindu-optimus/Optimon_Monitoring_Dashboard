import React, { useState, useEffect } from "react";
import "./Header.css";

export default function SettingsPanel({
  refreshTime,
  onRefreshTimeChange,
  gridCount,
  onGridCountChange,
  maxGridCount = 3,
  queueWarningLimit,
  onQueueWarningLimitChange,
  serviceDelayLimit,
  onServiceDelayLimitChange,
  selectedTrustIds,
  onClose,
  onSave,
}) {
  const [inputTime, setInputTime] = useState(refreshTime);
  const [inputGridCount, setInputGridCount] = useState(gridCount);
  const [inputQueueLimit, setInputQueueLimit] = useState(queueWarningLimit);
  const [inputServiceDelay, setInputServiceDelay] = useState(serviceDelayLimit);

  const [errors, setErrors] = useState({});

  const isAllTrustSelecteds = selectedTrustIds.includes("ALL");

  useEffect(() => {
    setInputTime(refreshTime);
    setInputGridCount(gridCount);
    setInputQueueLimit(queueWarningLimit);
    setInputServiceDelay(serviceDelayLimit);
  }, [refreshTime, gridCount, queueWarningLimit, serviceDelayLimit]);

  const validate = () => {
    const newErrors = {};

    if (!inputTime || inputTime < 1)
      newErrors.inputTime = "Refresh time must be at least 1 second";
    else if (inputTime > 180)
      newErrors.inputTime = "Refresh time cannot exceed 180 seconds";
    if (!inputGridCount || inputGridCount < 1) newErrors.inputGridCount = "Grid count must be at least 1";
    else if (inputGridCount > maxGridCount)
      newErrors.inputGridCount = `Grid count cannot exceed ${maxGridCount}`;
    if (!inputQueueLimit || inputQueueLimit < 1) newErrors.inputQueueLimit = "Queue warning limit must be at least 1";
    if (!inputServiceDelay || inputServiceDelay < 1)
      newErrors.inputServiceDelay = "Service delay limit must be at least 1 minute";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateGridCount = (value) => {
    if (!value || value < 1) {
      return "Grid count must be at least 1";
    }

    if (value > maxGridCount) {
      return `Grid count cannot exceed ${maxGridCount}`;
    }

    return "";
  };

  const handleSave = () => {
    if (!validate()) return;

    onRefreshTimeChange(inputTime);
    onGridCountChange(inputGridCount);
    onQueueWarningLimitChange(inputQueueLimit);
    onServiceDelayLimitChange(inputServiceDelay);

    onSave?.();
  };

  const handleBlur = () => validate();

  return (
    <div className="settings">

      <h3>Refresh Time (sec)</h3>
      <input
        type="number"
        min="1"
        max="180"
        // step="10"
        value={inputTime}
        title="Enter refresh time between 1 and 180 seconds"
        onChange={(e) => setInputTime(e.target.value === "" ? "" : +e.target.value)}
        onBlur={handleBlur}
      />
      {errors.inputTime && <p className="error">{errors.inputTime}</p>}

      <h3>Grid Count</h3>
      <input
        type="number"
        min="1"
        max={maxGridCount}
        value={inputGridCount}
        disabled={!isAllTrustSelecteds}   
        className={errors.inputGridCount ? "input-invalid" : ""}
        onChange={(e) => {
          const nextValue = e.target.value === "" ? "" : +e.target.value;
          setInputGridCount(nextValue);

          setErrors((prev) => {
            const nextErrors = { ...prev };
            const gridError = validateGridCount(nextValue);

            if (gridError) {
              nextErrors.inputGridCount = gridError;
            } else {
              delete nextErrors.inputGridCount;
            }

            return nextErrors;
          });
        }}
        onBlur={handleBlur}
      />
      {errors.inputGridCount && <p className="error">{errors.inputGridCount}</p>}

      {/* Optional helper text */}
      {!isAllTrustSelecteds && (
        <p className="info-text">
          Select All Trusts to change grid count
        </p>
      )}

      <h3>Queue Warning Limit</h3>
      <input
        type="number"
        min="1"
        value={inputQueueLimit}
        onChange={(e) => setInputQueueLimit(e.target.value === "" ? "" : +e.target.value)}
        onBlur={handleBlur}
      />
      {errors.inputQueueLimit && <p className="error">{errors.inputQueueLimit}</p>}

      <h3>Service Delay Limit (mins)</h3>
      <input
        type="number"
        min="1"
        value={inputServiceDelay}
        onChange={(e) =>
          setInputServiceDelay(e.target.value === "" ? "" : +e.target.value)
        }
        onBlur={handleBlur}
      />
      {errors.inputServiceDelay && (
        <p className="error">{errors.inputServiceDelay}</p>
      )}

      <div className="settings-buttons">
        <button onClick={handleSave} disabled={Object.keys(errors).length > 0}>
          Save
        </button>
        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
