// Profile.jsx
import React, { useEffect, useState } from "react";
import SidebarLayout from "../../layouts/SidebarLayout";
import "./Profile.css";

// Later you can add: role from props or backend
export default function Profile({ username = "User", defaultRole = "Admin" }) {
  const [loading, setLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState("");

  const [personal, setPersonal] = useState({
    firstName: "",
    lastName: "",
    dob: "",
    email: "",
    phone: "",
    role: "",
    location: "",
    avatar: "", // avatar image as data URL
  });

  const [address, setAddress] = useState({
    country: "",
    city: "",
    postalCode: "",
  });

  const [personalEditing, setPersonalEditing] = useState(false);
  const [addressEditing, setAddressEditing] = useState(false);

  const storageKey = `profile_${username}`;

  // ---------- LOAD FROM localStorage ----------
  useEffect(() => {
    setLoading(true);
    setSaveMessage("");

    const saved = localStorage.getItem(storageKey);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);

        setPersonal({
          firstName: parsed.personal?.firstName ?? username,
          lastName: parsed.personal?.lastName ?? "",
          dob: parsed.personal?.dob ?? "",
          email: parsed.personal?.email ?? "",
          phone: parsed.personal?.phone ?? "",
          role: parsed.personal?.role ?? defaultRole,
          location: parsed.personal?.location ?? "",
          avatar: parsed.personal?.avatar ?? "",
        });

        setAddress({
          country: parsed.address?.country ?? "",
          city: parsed.address?.city ?? "",
          postalCode: parsed.address?.postalCode ?? "",
        });
      } catch (e) {
        console.error("Error reading profile from localStorage", e);
        // fallback to defaults
        setPersonal((prev) => ({
          ...prev,
          firstName: username,
          role: defaultRole,
        }));
      }
    } else {
      // first time user → initialise with username + defaultRole
      setPersonal((prev) => ({
        ...prev,
        firstName: username,
        role: defaultRole,
      }));
    }

    setLoading(false);
  }, [storageKey, username, defaultRole]);

  // ---------- SAVE TO localStorage ----------
  const saveToLocalStorage = () => {
    const payload = {
      personal,
      address,
    };

    localStorage.setItem(storageKey, JSON.stringify(payload));
    // setSaveMessage("Profile saved.");
    setTimeout(() => setSaveMessage(""), 2500);
  };

  const handlePersonalChange = (field, value) => {
    setPersonal((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddressChange = (field, value) => {
    setAddress((prev) => ({ ...prev, [field]: value }));
  };

  const handleSavePersonal = () => {
    saveToLocalStorage();
    setPersonalEditing(false);
  };

  const handleSaveAddress = () => {
    saveToLocalStorage();
    setAddressEditing(false);
  };

  // ---------- AVATAR HANDLERS ----------
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      // store in state
      setPersonal((prev) => ({ ...prev, avatar: dataUrl }));
      // save immediately
      const payload = {
        personal: { ...personal, avatar: dataUrl },
        address,
      };
      localStorage.setItem(storageKey, JSON.stringify(payload));
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarRemove = () => {
    setPersonal((prev) => ({ ...prev, avatar: "" }));
    const payload = {
      personal: { ...personal, avatar: "" },
      address,
    };
    localStorage.setItem(storageKey, JSON.stringify(payload));
  };

  const fullName =
    `${personal.firstName || ""} ${personal.lastName || ""}`.trim() ||
    username;

  if (loading) {
    return (
      <div className="profile-page">
        <h2 className="profile-page-title">My Profile</h2>
        <div className="profile-card">
          <p>Loading profile…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="content">
      <div className="profile-page">
        <h2 className="profile-page-title">My Profile</h2>

        {saveMessage && (
          <div className="profile-save-message">{saveMessage}</div>
        )}

        {/* Top summary card */}
        <section className="profile-card">
          <div className="profile-avatar">
            <div className="avatar-circle">
              {personal.avatar ? (
                <img src={personal.avatar} alt="Profile" />
              ) : (
                <span>
                  {(personal.firstName?.[0] || username[0] || "U").toUpperCase()}
                  {(personal.lastName?.[0] || "").toUpperCase()}
                </span>
              )}
            </div>

            {/* Icon actions overlay */}
            <div className="avatar-actions">
              <label className="avatar-icon-btn edit" title="Change photo">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                />
                <i className="ri-pencil-line"></i>
              </label>

              {personal.avatar && (
                <button
                  type="button"
                  className="avatar-icon-btn remove"
                  onClick={handleAvatarRemove}
                  title="Remove photo"
                >
                  <i className="ri-delete-bin-6-line"></i>
                </button>
              )}
            </div>
          </div>

          <div className="profile-main-info">
            <h3 className="profile-name">{fullName}</h3>
            <p className="profile-role">{personal.role || defaultRole}</p>
            <p className="profile-location">
              {personal.location ||
                [address.city, address.country].filter(Boolean).join(", ") ||
                ""}
            </p>
          </div>
        </section>

        {/* Personal Information */}
        <section className="profile-section">
          <div className="section-header">
            <h3>Personal Information</h3>
            <button
              type="button"
              className="section-edit-btn"
              onClick={() =>
                personalEditing ? handleSavePersonal() : setPersonalEditing(true)
              }
            >
              {personalEditing ? "Save" : "Edit"}
            </button>
          </div>

          <div className="section-body grid-3">
            <div className="field">
              <span className="field-label">First Name</span>
              {personalEditing ? (
                <input
                  type="text"
                  value={personal.firstName}
                  onChange={(e) =>
                    handlePersonalChange("firstName", e.target.value)
                  }
                />
              ) : (
                <span className="field-value">{personal.firstName || "-"}</span>
              )}
            </div>

            <div className="field">
              <span className="field-label">Last Name</span>
              {personalEditing ? (
                <input
                  type="text"
                  value={personal.lastName}
                  onChange={(e) =>
                    handlePersonalChange("lastName", e.target.value)
                  }
                />
              ) : (
                <span className="field-value">{personal.lastName || "-"}</span>
              )}
            </div>

            <div className="field">
              <span className="field-label">Date of Birth</span>
              {personalEditing ? (
                <input
                  type="date"
                  value={personal.dob}
                  onChange={(e) => handlePersonalChange("dob", e.target.value)}
                />
              ) : (
                <span className="field-value">
                  {personal.dob
                    ? new Date(personal.dob).toLocaleDateString("en-GB")
                    : "-"}
                </span>
              )}
            </div>

            <div className="field">
              <span className="field-label">Email Address</span>
              {personalEditing ? (
                <input
                  type="email"
                  value={personal.email}
                  onChange={(e) =>
                    handlePersonalChange("email", e.target.value)
                  }
                />
              ) : (
                <span className="field-value">{personal.email || "-"}</span>
              )}
            </div>

            <div className="field">
              <span className="field-label">Phone Number</span>
              {personalEditing ? (
                <input
                  type="text"
                  value={personal.phone}
                  onChange={(e) =>
                    handlePersonalChange("phone", e.target.value)
                  }
                />
              ) : (
                <span className="field-value">{personal.phone || "-"}</span>
              )}
            </div>

            <div className="field">
              <span className="field-label">User Role</span>
              {personalEditing ? (
                <select
                  value={personal.role}
                  onChange={(e) =>
                    handlePersonalChange("role", e.target.value)
                  }
                >
                  <option value="">Select role</option>
                  <option value="Admin">Admin</option>
                  <option value="User">User</option>
                  <option value="Manager">Manager</option>
                </select>
              ) : (
                <span className="field-value">{personal.role || "-"}</span>
              )}
            </div>
          </div>
        </section>

        {/* Address */}
        <section className="profile-section">
          <div className="section-header">
            <h3>Address</h3>
            <button
              type="button"
              className="section-edit-btn"
              onClick={() =>
                addressEditing ? handleSaveAddress() : setAddressEditing(true)
              }
            >
              {addressEditing ? "Save" : "Edit"}
            </button>
          </div>

          <div className="section-body grid-3">
            <div className="field">
              <span className="field-label">Country</span>
              {addressEditing ? (
                <input
                  type="text"
                  value={address.country}
                  onChange={(e) =>
                    handleAddressChange("country", e.target.value)
                  }
                />
              ) : (
                <span className="field-value">{address.country || "-"}</span>
              )}
            </div>

            <div className="field">
              <span className="field-label">City</span>
              {addressEditing ? (
                <input
                  type="text"
                  value={address.city}
                  onChange={(e) => handleAddressChange("city", e.target.value)}
                />
              ) : (
                <span className="field-value">{address.city || "-"}</span>
              )}
            </div>

            <div className="field">
              <span className="field-label">Postal Code</span>
              {addressEditing ? (
                <input
                  type="text"
                  value={address.postalCode}
                  onChange={(e) =>
                    handleAddressChange("postalCode", e.target.value)
                  }
                />
              ) : (
                <span className="field-value">{address.postalCode || "-"}</span>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
