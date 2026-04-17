import React, { useEffect, useMemo, useState } from "react";
import {
  createCriticalInterface,
  updateCriticalInterface,
} from "../api/criticalInterfacesService";
import "./TrustForm.css";
import "./AlertsModuleForm.css";

const VIEW_OPTIONS = {
  INBOUND: "INBOUND",
  OTHER: "OTHER",
};

const getFirstDefinedValue = (item, keys, fallback = "") => {
  for (const key of keys) {
    const value = item?.[key];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }

  return fallback;
};

const getBooleanValue = (item, keys, fallback = false) => {
  for (const key of keys) {
    const value = item?.[key];

    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "string") {
      const normalizedValue = value.trim().toLowerCase();

      if (["true", "yes", "1"].includes(normalizedValue)) {
        return true;
      }

      if (["false", "no", "0"].includes(normalizedValue)) {
        return false;
      }
    }
  }

  return fallback;
};

const createInitialForm = (initial, defaultTrustId, defaultView) => ({
  trustId:
    String(
      initial?.trustId ??
        initial?.rawItem?.trustId ??
        initial?.rawItem?.trust_id ??
        defaultTrustId ??
        ""
    ) || "",
  interfaceType: initial?.interfaceType || defaultView || VIEW_OPTIONS.INBOUND,
  serviceName: getFirstDefinedValue(initial?.rawItem, [
    "serviceName",
    "interfaceName",
    "interface_name",
    "name",
  ]),
  weekDayInside: getFirstDefinedValue(initial?.rawItem, [
    "dayIdleTime",
    "idleTimeWeekDayInsideBusinessHours",
    "weekdayInsideBusinessHours",
    "weekDayInsideBusinessHours",
  ]),
  weekDayOutside: getFirstDefinedValue(initial?.rawItem, [
    "nightIdleTime",
    "weekDayOutsideBusinessHours",
    "weekdayOutsideBusinessHours",
    "outsideBusinessHoursWeekDay",
  ]),
  weekendInside: getFirstDefinedValue(initial?.rawItem, [
    "weDayIdleTime",
    "weekendDayIdleTime",
    "idleTimeWeekendInsideBusinessHours",
    "weekendInsideBusinessHours",
  ]),
  weekendOutside: getFirstDefinedValue(initial?.rawItem, [
    "weNightIdleTime",
    "weekendNightIdleTime",
    "weekendOutsideBusinessHours",
    "outsideBusinessHoursWeekend",
  ]),
  isMondayIgnore: getBooleanValue(initial?.rawItem, [
    "isMondayIgnore",
    "mondayIgnore",
  ]),
  isCritical: getBooleanValue(initial?.rawItem, [
    "isCritical",
    "critical",
    "is_critical",
  ], true),
  deleted: getBooleanValue(initial?.rawItem, ["deleted", "isDeleted"], false),
  interfaceName: getFirstDefinedValue(initial?.rawItem, [
    "endpointName",
    "queueName",
    "interfaceName",
    "interface_name",
    "serviceName",
  ]),
});

export default function AlertsModuleForm({
  initial = null,
  trusts = [],
  defaultTrustId = "",
  defaultView = VIEW_OPTIONS.INBOUND,
  onSuccess,
  onCancel,
}) {
  const [form, setForm] = useState(() =>
    createInitialForm(initial, defaultTrustId, defaultView)
  );
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setForm(createInitialForm(initial, defaultTrustId, defaultView));
    setErrors({});
    setTouched({});
    setError("");
    setSuccess("");
  }, [initial, defaultTrustId, defaultView]);

  const isEditMode = Boolean(initial?.id);
  const isInbound = form.interfaceType === VIEW_OPTIONS.INBOUND;
  const alertEnabled = Boolean(form.deleted);
  const selectedTrust = trusts.find(
    (trust) => String(trust.id) === String(form.trustId)
  );
  const selectedTrustName =
    selectedTrust?.name || initial?.rawItem?.trustName || "";
  const inboundValidationOrder = [
    "trustId",
    "interfaceType",
    "serviceName",
    "weekDayInside",
    "weekDayOutside",
    "weekendInside",
    "weekendOutside",
  ];
  const otherValidationOrder = ["trustId", "interfaceType", "interfaceName"];

  const getFieldError = (field, nextForm) => {
    switch (field) {
      case "trustId":
        return nextForm.trustId ? "" : "Trust is required";
      case "interfaceType":
        return nextForm.interfaceType ? "" : "Component type is required";
      case "serviceName":
        return nextForm.serviceName.trim() ? "" : "Inbound name is required";
      case "weekDayInside":
        if (!nextForm.weekDayInside.trim()) {
          return "Weekday inside business hours is required";
        }
        return /^\d+$/.test(nextForm.weekDayInside.trim())
          ? ""
          : "Please enter numbers only";
      case "weekDayOutside":
        if (!nextForm.weekDayOutside.trim()) {
          return "Weekday outside business hours is required";
        }
        return /^\d+$/.test(nextForm.weekDayOutside.trim())
          ? ""
          : "Please enter numbers only";
      case "weekendInside":
        if (!nextForm.weekendInside.trim()) {
          return "Weekend inside business hours is required";
        }
        return /^\d+$/.test(nextForm.weekendInside.trim())
          ? ""
          : "Please enter numbers only";
      case "weekendOutside":
        if (!nextForm.weekendOutside.trim()) {
          return "Weekend outside business hours is required";
        }
        return /^\d+$/.test(nextForm.weekendOutside.trim())
          ? ""
          : "Please enter numbers only";
      case "interfaceName":
        return nextForm.interfaceName.trim() ? "" : "Interface name is required";
      default:
        return "";
    }
  };

  const validateFields = (fields, nextForm) => {
    const nextErrors = {};

    fields.forEach((field) => {
      const fieldError = getFieldError(field, nextForm);
      if (fieldError) {
        nextErrors[field] = fieldError;
      }
    });

    return nextErrors;
  };

  const validate = (nextForm = form) => {
    const fields = nextForm.interfaceType === VIEW_OPTIONS.INBOUND
      ? inboundValidationOrder
      : otherValidationOrder;
    const nextErrors = validateFields(fields, nextForm);

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const updateManagedErrors = (validationOrder, nextTouched, validationErrors) => {
    setErrors((prev) => {
      const updatedErrors = { ...prev };
      const managedFields = new Set([
        ...inboundValidationOrder,
        ...otherValidationOrder,
      ]);

      Object.keys(updatedErrors).forEach((key) => {
        if (managedFields.has(key)) {
          delete updatedErrors[key];
        }
      });

      Object.keys(nextTouched).forEach((key) => {
        if (validationOrder.includes(key) && validationErrors[key]) {
          updatedErrors[key] = validationErrors[key];
        }
      });

      return updatedErrors;
    });
  };

  const handleChange = (field, value) => {
    const nextForm = {
      ...form,
      [field]: value,
    };

    setForm(nextForm);
    if (touched[field]) {
      const validationOrder =
        nextForm.interfaceType === VIEW_OPTIONS.INBOUND
          ? inboundValidationOrder
          : otherValidationOrder;
      const validationErrors = validateFields([field], nextForm);
      updateManagedErrors(validationOrder, touched, validationErrors);
    }
  };

  const handleFieldFocus = (field) => {
    const validationOrder =
      form.interfaceType === VIEW_OPTIONS.INBOUND
        ? inboundValidationOrder
        : otherValidationOrder;
    const fieldIndex = validationOrder.indexOf(field);

    if (fieldIndex <= 0) {
      return;
    }

    const previousFields = validationOrder.slice(0, fieldIndex);
    const nextTouched = {
      ...touched,
      ...Object.fromEntries(previousFields.map((item) => [item, true])),
    };
    const validationErrors = validateFields(previousFields, form);

    setTouched(nextTouched);
    updateManagedErrors(validationOrder, nextTouched, validationErrors);
  };

  const handleFieldBlur = (field) => {
    const validationOrder =
      form.interfaceType === VIEW_OPTIONS.INBOUND
        ? inboundValidationOrder
        : otherValidationOrder;
    const nextTouched = {
      ...touched,
      [field]: true,
    };
    const validationErrors = validateFields([field], form);

    setTouched(nextTouched);
    updateManagedErrors(validationOrder, nextTouched, validationErrors);
  };

  const isFormValid = useMemo(() => {
    if (!form.trustId || !form.interfaceType) {
      return false;
    }

    if (isInbound) {
      return (
        Boolean(form.serviceName.trim()) &&
        /^\d+$/.test(form.weekDayInside.trim()) &&
        /^\d+$/.test(form.weekDayOutside.trim()) &&
        /^\d+$/.test(form.weekendInside.trim()) &&
        /^\d+$/.test(form.weekendOutside.trim())
      );
    }

    return Boolean(form.interfaceName.trim());
  }, [form, isInbound]);

  const toggleAlertStatus = () => {
    handleChange("deleted", !alertEnabled);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    setTouched(
      Object.fromEntries(
        (form.interfaceType === VIEW_OPTIONS.INBOUND
          ? inboundValidationOrder
          : otherValidationOrder
        ).map((field) => [field, true])
      )
    );

    if (!validate()) return;

    const trustId = Number(form.trustId);
    const payload = isInbound
      ? {
          ...(initial?.rawItem || {}),
          serviceName: form.serviceName.trim(),
          trustId,
          trustName: selectedTrustName,
          dayIdleTime: Number(form.weekDayInside.trim()),
          nightIdleTime: Number(form.weekDayOutside.trim()),
          weDayIdleTime: Number(form.weekendInside.trim()),
          weNightIdleTime: Number(form.weekendOutside.trim()),
          isMondayIgnore: Boolean(form.isMondayIgnore),
          isCritical: Boolean(form.isCritical),
          deleted: Boolean(form.deleted),
        }
      : {
          ...(initial?.rawItem || {}),
          endpointName: form.interfaceName.trim(),
          interfaceName: form.interfaceName.trim(),
          isCritical: Boolean(form.isCritical),
          deleted: Boolean(form.deleted),
          trustId,
          trustName: selectedTrustName,
        };

    try {
      setLoading(true);

      if (isEditMode) {
        console.log("AlertsModule update payload:", payload);
        await updateCriticalInterface({
          trustId,
          interfaceType: form.interfaceType,
          interfaceId: initial.id,
          payload,
        });
        setSuccess("AlertsModule updated successfully");
      } else {
        console.log("AlertsModule create payload:", payload);
        await createCriticalInterface({
          trustId,
          interfaceType: form.interfaceType,
          payload,
        });
        setSuccess("AlertsModule created successfully");
      }

      onSuccess?.(form.interfaceType);
    } catch (submitError) {
      console.error("AlertsModule save failed:", submitError);
      setError(submitError.message || "Failed to save AlertsModule");
    } finally {
      setLoading(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="content">
      <h2 className="form-title">
        {isEditMode ? "Edit Interface Alert" : "Add Interface Alert"}
      </h2>

      <div className="critical-form-actions">
        <div className="icon-btn" onClick={onCancel}>
          <i className="fa-solid fa-less-than"></i>
        </div>

        <button
          type="button"
          className="critical-list-btn"
          onClick={onCancel}
        >
          List of Interface Alerts
        </button>
      </div>

      {error && <div className="form-msg form-error">{error}</div>}
      {success && <div className="form-msg form-success">{success}</div>}

      <form className="form" onSubmit={handleSubmit} noValidate>
        <label className="form-label">Trust*</label>
        <select
          className={`form-input ${errors.trustId ? "input-invalid" : ""}`}
          value={form.trustId}
          onChange={(e) => handleChange("trustId", e.target.value)}
          onBlur={() => handleFieldBlur("trustId")}
        >
          <option value="">Select trust</option>
          {trusts.map((trust) => (
            <option key={trust.id} value={trust.id}>
              {trust.name}
            </option>
          ))}
        </select>
        {errors.trustId && <p className="input-error">{errors.trustId}</p>}

        <label className="form-label">Component Type*</label>
        <select
          className={`form-input ${errors.interfaceType ? "input-invalid" : ""}`}
          value={form.interfaceType}
          onChange={(e) => handleChange("interfaceType", e.target.value)}
          onBlur={() => handleFieldBlur("interfaceType")}
        >
          <option value={VIEW_OPTIONS.INBOUND}>Inbound components</option>
          <option value={VIEW_OPTIONS.OTHER}>All other components</option>
        </select>
        {errors.interfaceType && (
          <p className="input-error">{errors.interfaceType}</p>
        )}

        {isInbound ? (
          <>
            <label className="form-label">Inbound Name*</label>
            <input
              className={`form-input ${errors.serviceName ? "input-invalid" : ""}`}
              value={form.serviceName}
              onChange={(e) => handleChange("serviceName", e.target.value)}
              onFocus={() => handleFieldFocus("serviceName")}
              onBlur={() => handleFieldBlur("serviceName")}
              placeholder="Enter inbound name"
            />
            {errors.serviceName && (
              <p className="input-error">{errors.serviceName}</p>
            )}

            <div className="group">
              <label className="form-label">
                Idle time: Weekday
              </label>

              <div className="row">
                <div className="col">
                  <label className="sub-label">
                    Inside business hours{" "}
                    <span className="time-highlight">
                      (09:00 AM to 07:00 PM)
                    </span>
                  </label>
                  <input
                    className={`form-input ${errors.weekDayInside ? "input-invalid" : ""}`}
                    value={form.weekDayInside}
                    onChange={(e) => handleChange("weekDayInside", e.target.value)}
                    onFocus={() => handleFieldFocus("weekDayInside")}
                    onBlur={() => handleFieldBlur("weekDayInside")}
                    placeholder="Enter value"
                  />
                  {errors.weekDayInside && (
                    <p className="input-error">{errors.weekDayInside}</p>
                  )}
                </div>

                <div className="col">
                  <label className="sub-label">
                    Outside business hours{" "}
                    <span className="time-highlight">
                      (07:00 PM to 09:00 AM)
                    </span>
                  </label>
                  <input
                    className={`form-input ${errors.weekDayOutside ? "input-invalid" : ""}`}
                    value={form.weekDayOutside}
                    onChange={(e) => handleChange("weekDayOutside", e.target.value)}
                    onFocus={() => handleFieldFocus("weekDayOutside")}
                    onBlur={() => handleFieldBlur("weekDayOutside")}
                    placeholder="Enter value"
                  />
                  {errors.weekDayOutside && (
                    <p className="input-error">{errors.weekDayOutside}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="group">
              <label className="form-label">
                Idle time: Weekend
              </label>

              <div className="row">
                <div className="col">
                  <label className="sub-label">
                    Inside business hours{" "}
                    <span className="time-highlight">
                      (09:00 AM to 07:00 PM)
                    </span>
                  </label>
                  <input
                    className={`form-input ${errors.weekendInside ? "input-invalid" : ""}`}
                    value={form.weekendInside}
                    onChange={(e) => handleChange("weekendInside", e.target.value)}
                    onFocus={() => handleFieldFocus("weekendInside")}
                    onBlur={() => handleFieldBlur("weekendInside")}
                    placeholder="Enter value"
                  />
                  {errors.weekendInside && (
                    <p className="input-error">{errors.weekendInside}</p>
                  )}
                </div>

                <div className="col">
                  <label className="sub-label">
                    Outside business hours{" "}
                    <span className="time-highlight">
                      (07:00 PM to 09:00 AM)
                    </span>
                  </label>
                  <input
                    className={`form-input ${errors.weekendOutside ? "input-invalid" : ""}`}
                    value={form.weekendOutside}
                    onChange={(e) => handleChange("weekendOutside", e.target.value)}
                    onFocus={() => handleFieldFocus("weekendOutside")}
                    onBlur={() => handleFieldBlur("weekendOutside")}
                    placeholder="Enter value"
                  />
                  {errors.weekendOutside && (
                    <p className="input-error">{errors.weekendOutside}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="row critical-form-switch-row">
              <div className="col">
                <label className="form-label">Ignore Monday</label>
                <div className="toggle-group">
                  <button
                    type="button"
                    className={`toggle-btn yes ${
                      form.isMondayIgnore ? "active" : ""
                    }`}
                    onClick={() => handleChange("isMondayIgnore", true)}
                  >
                    YES
                  </button>
                  <button
                    type="button"
                    className={`toggle-btn no ${
                      !form.isMondayIgnore ? "active" : ""
                    }`}
                    onClick={() => handleChange("isMondayIgnore", false)}
                  >
                    NO
                  </button>
                </div>
              </div>

              <div className="col">
                <label className="form-label">Is Critical</label>
                <div className="toggle-group">
                  <button
                    type="button"
                    className={`toggle-btn yes ${
                      form.isCritical ? "active" : ""
                    }`}
                    onClick={() => handleChange("isCritical", true)}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    className={`toggle-btn no ${
                      !form.isCritical ? "active" : ""
                    }`}
                    onClick={() => handleChange("isCritical", false)}
                  >
                    No
                  </button>
                </div>
              </div>

              <div className="col">
                <label className="form-label">Alert</label>
                <button
                  type="button"
                  className={`critical-switch critical-form-alert-switch ${
                    alertEnabled ? "enabled" : "disabled"
                  }`}
                  onClick={toggleAlertStatus}
                  role="switch"
                  aria-checked={alertEnabled}
                  aria-label={alertEnabled ? "Disable alert" : "Enable alert"}
                  title={alertEnabled ? "Disable alert" : "Enable alert"}
                >
                  <span className="critical-switch-track">
                    <span className="critical-switch-thumb"></span>
                  </span>
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <label className="form-label">Interface Name*</label>
            <input
              className={`form-input ${errors.interfaceName ? "input-invalid" : ""}`}
              value={form.interfaceName}
              onChange={(e) => handleChange("interfaceName", e.target.value)}
              onFocus={() => handleFieldFocus("interfaceName")}
              onBlur={() => handleFieldBlur("interfaceName")}
              placeholder="Enter interface name"
            />
            {errors.interfaceName && (
              <p className="input-error">{errors.interfaceName}</p>
            )}

            <div className="row critical-form-switch-row">
              <div className="col">
                <label className="form-label">Is Critical</label>
                <div className="toggle-group">
                  <button
                    type="button"
                    className={`toggle-btn yes ${
                      form.isCritical ? "active" : ""
                    }`}
                    onClick={() => handleChange("isCritical", true)}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    className={`toggle-btn no ${
                      !form.isCritical ? "active" : ""
                    }`}
                    onClick={() => handleChange("isCritical", false)}
                  >
                    No                  
                  </button>
                </div>
              </div>

              <div className="col">
                <label className="form-label">Alert</label>
                <button
                  type="button"
                  className={`critical-switch critical-form-alert-switch ${
                    alertEnabled ? "enabled" : "disabled"
                  }`}
                  onClick={toggleAlertStatus}
                  role="switch"
                  aria-checked={alertEnabled}
                  aria-label={alertEnabled ? "Disable alert" : "Enable alert"}
                  title={alertEnabled ? "Disable alert" : "Enable alert"}
                >
                  <span className="critical-switch-track">
                    <span className="critical-switch-thumb"></span>
                  </span>
                </button>
              </div>
            </div>
          </>
        )}

        <button
          className="btn"
          type="submit"
          disabled={!isFormValid || loading}
        >
          {loading ? "Saving..." : "Submit"}
        </button>
      </form>
    </div>
  );
}
