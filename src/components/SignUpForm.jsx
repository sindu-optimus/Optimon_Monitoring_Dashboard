import React, { useEffect, useRef, useState } from "react";
import { getTrusts } from "../api/trustService";
import { createUser, updateUser } from "../api/userService";
import "./SignUpForm.css";

export default function SignUpForm({ onCancel, onSuccess, initial = {} }) {
  const ROLES = [
    { id: 1, label: "Admin" },
    { id: 2, label: "Operator" },
    { id: 3, label: "Developer" },
    { id: 4, label: "Viewer" },
  ];

  const ALL_TRUST_LABEL = "All";
  const [trustOptions, setTrustOptions] = useState([]);
  const allTrustLabels = trustOptions.map((trust) => trust.label);
  const trustDropdownRef = useRef(null);

  const initialRole =
    initial.role ??
    ROLES.find((role) => role.id === initial.roleId)?.label ??
    "";

  const [form, setForm] = useState({
    firstName: initial.firstName ?? "",
    lastName: initial.lastName ?? "",
    role: initialRole,
    trusts: initial.trusts ?? [],
    email: initial.email ?? "",
    username: initial.username ?? initial.email ?? "",
    phone: String(initial.phone ?? initial.mobile ?? ""),
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isTrustDropdownOpen, setIsTrustDropdownOpen] = useState(false);

  useEffect(() => {
    let isActive = true;

    const fetchTrustOptions = async () => {
      try {
        const res = await getTrusts();
        if (!isActive) return;

        setTrustOptions(
          (res.data || []).map((trust) => ({
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
  }, []);

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

  useEffect(() => {
    if (trustOptions.length === 0) return;

    const resolvedTrusts =
      initial.trusts ??
      initial.trustIds
        ?.map((trustId) => trustOptions.find((trust) => trust.id === trustId)?.label)
        .filter(Boolean) ??
      [];

    setForm((prev) => {
      const alreadySynced =
        prev.trusts.length === resolvedTrusts.length &&
        prev.trusts.every((trust, index) => trust === resolvedTrusts[index]);

      if (alreadySynced) {
        return prev;
      }

      return {
        ...prev,
        trusts: resolvedTrusts,
      };
    });
  }, [initial.trustIds, initial.trusts, trustOptions]);

  /* ---------- FIELD ORDER ---------- */
  const FIELD_ORDER = [
    "firstName",
    "role",
    "trusts",
    "email",
    "phone",
    "username",
    "password",
  ];

  /* ---------- CASCADING VALIDATION ---------- */
  const validateUpTo = (targetField) => {
    const err = {};

    for (const field of FIELD_ORDER) {
      if (field === "firstName" && !form.firstName.trim()) {
        err.firstName = "First name is required";
      }

      if (field === "role" && !form.role) {
        err.role = "Role is required";
      }

      if (field === "trusts" && form.trusts.length === 0) {
        err.trusts = "Select at least one trust";
      }

      if (field === "email") {
        if (!form.email.trim()) {
          err.email = "Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
          err.email = "Enter a valid email address";
        }
      }

      if (field === "phone") {
        if (!form.phone.trim()) {
          err.phone = "Phone number is required";
        } else if (!/^\d{10}$/.test(form.phone)) {
          err.phone = "Phone number must be 10 digits";
        }
      }

      if (field === "password") {
        if (!initial.id && !form.password.trim()) {
          err.password = "Password is required";
        } else if (form.password && form.password.length < 6) {
          err.password = "Minimum 6 characters required";
        }
      }

      if (field === targetField) break;
    }

    setErrors((prev) => ({ ...prev, ...err }));
  };

  /* ---------- CHANGE HANDLERS ---------- */
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => {
      const nextForm = { ...prev, [name]: value };

      if (name === "email") {
        nextForm.username = value;
      }

      return nextForm;
    });

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleTrustToggle = (trustLabel) => {
    let values;

    if (trustLabel === ALL_TRUST_LABEL) {
      const allSelected = form.trusts.includes(ALL_TRUST_LABEL);
      values = allSelected ? [] : [ALL_TRUST_LABEL, ...allTrustLabels];
    } else {
      const selectedWithoutAll = form.trusts.filter(
        (trust) => trust !== ALL_TRUST_LABEL
      );
      const isSelected = selectedWithoutAll.includes(trustLabel);

      values = isSelected
        ? selectedWithoutAll.filter((trust) => trust !== trustLabel)
        : [...selectedWithoutAll, trustLabel];

      if (values.length === allTrustLabels.length && allTrustLabels.length > 0) {
        values = [ALL_TRUST_LABEL, ...allTrustLabels];
      }
    }

    setForm((prev) => ({
      ...prev,
      trusts: values,
    }));

    if (errors.trusts) {
      setErrors((prev) => ({ ...prev, trusts: null }));
    }
  };

  const selectedTrustLabels = form.trusts.includes(ALL_TRUST_LABEL)
    ? allTrustLabels
    : form.trusts;

  const trustDisplayValue =
    selectedTrustLabels.length === 0
      ? "Select trusts"
      : form.trusts.includes(ALL_TRUST_LABEL)
        ? "All trusts selected"
        : selectedTrustLabels.join(", ");

  /* ---------- SUBMIT ---------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    setSuccess("");

    validateUpTo("password");
    if (!isFormValid) return;

    const roleId =
      ROLES.find((role) => role.label === form.role)?.id ?? 0;

    const trustIds = selectedTrustLabels
      .map((trustLabel) => trustOptions.find((trust) => trust.label === trustLabel)?.id)
      .filter((trustId) => Number.isInteger(trustId));

    const payload = {
      email: form.email.trim(),
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      mobile: Number(form.phone),
      password: form.password,
      roleId,
      trustIds,
      username: form.email.trim(),
    };

    try {
      setLoading(true);
      console.log("Create user payload:", payload);

      if (initial?.id) {
        await updateUser(initial.id, payload);
        setSuccess("User updated successfully");
      } else {
        await createUser(payload);
        setSuccess("User created successfully");
      }

      onSuccess?.();

    } catch (err) {
      console.error("API Error:", err);
      console.error("API Error Response:", err.response?.data);
      setSubmitError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.response?.data ||
          "Request failed while saving user"
      );
    } finally {
      setLoading(false);
    }
  };

  /* ---------- FORM VALID ---------- */
  const isFormValid =
    form.firstName.trim() &&
    form.role &&
    form.trusts.length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) &&
    /^\d{10}$/.test(form.phone) &&
    (initial.id
      ? !form.password || form.password.length >= 6
      : form.password.length >= 6);

  return (
    <div className="content">
      <div className="form-header">
        <div className="back-btn">
          <div className="icon-btn" onClick={onCancel}>
            <i className="fa-solid fa-less-than"></i>
          </div>
          <button className="add-user-btn" onClick={onCancel}>
              List of Users
          </button>
        </div>
        <h2 className="form-title">
          {initial.id ? "Edit User" : "Sign Up"}
        </h2>
      </div>

      {success && <div className="form-msg form-success">{success}</div>}
      {submitError && <div className="form-msg form-error">{submitError}</div>}

      <form className="form" onSubmit={handleSubmit} noValidate>
        {/* First Name */}
        <label className="form-label">First Name*</label>
        <input
          name="firstName"
          className={`form-input ${errors.firstName ? "input-invalid" : ""}`}
          value={form.firstName}
          onChange={handleChange}
        />
        {errors.firstName && (
          <p className="input-error">{errors.firstName}</p>
        )}

        {/* Last Name */}
        <label className="form-label">Last Name (optional)</label>
        <input
          name="lastName"
          className="form-input"
          value={form.lastName}
          onChange={handleChange}
        />

        {/* Role */}
        <label className="form-label">Role*</label>
        <select
          name="role"
          className={`form-input ${errors.role ? "input-invalid" : ""}`}
          value={form.role}
          onFocus={() => validateUpTo("firstName")}
          onChange={handleChange}
        >
          <option value="">Select role</option>
          {ROLES.map((role) => (
            <option key={role.id} value={role.label}>
              {role.label}
            </option>
          ))}
        </select>
        {errors.role && <p className="input-error">{errors.role}</p>}

        {/* Trust */}
        <label className="form-label">Trust*</label>
        <div
          className="multiSelect"
          ref={trustDropdownRef}
          onFocus={() => validateUpTo("role")}
        >
          <button
            type="button"
            className={`multiSelectTrigger ${errors.trusts ? "input-invalid" : ""}`}
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
                  checked={form.trusts.includes(ALL_TRUST_LABEL)}
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
        {errors.trusts && <p className="input-error">{errors.trusts}</p>}

        {/* Email */}
        <label className="form-label">Email*</label>
        <input
          name="email"
          className={`form-input ${errors.email ? "input-invalid" : ""}`}
          value={form.email}
          onFocus={() => validateUpTo("trusts")}
          onChange={handleChange}
        />
        {errors.email && <p className="input-error">{errors.email}</p>}

        {/* Phone */}
        <label className="form-label">Phone*</label>
        <input
          name="phone"
          className={`form-input ${errors.phone ? "input-invalid" : ""}`}
          value={form.phone}
          onFocus={() => validateUpTo("email")}
          onChange={handleChange}
        />
        {errors.phone && <p className="input-error">{errors.phone}</p>}

        <label className="form-label">Username*</label>
        <input
          name="username"
          className={`form-input ${errors.username ? "input-invalid" : ""}`}
          value={form.username}
          readOnly
        />

        {/* Password */}
        <label className="form-label">
          Password{initial.id ? " (optional)" : "*"}
        </label>
        <input
          type="password"
          name="password"
          className={`form-input ${errors.password ? "input-invalid" : ""}`}
          value={form.password}
          onFocus={() => validateUpTo("phone")}
          onChange={handleChange}
        />
        {errors.password && (
          <p className="input-error">{errors.password}</p>
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
