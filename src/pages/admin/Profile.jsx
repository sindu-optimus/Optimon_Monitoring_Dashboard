import React, { useEffect, useState } from "react";
import { getUser, updateUser } from "../../api/userService";
import "./Profile.css";

const ROLE_LABELS = {
  1: "Admin",
  2: "Operator",
  3: "Developer",
  4: "Viewer",
};

export default function Profile({
  username = "User",
  defaultRole = "Admin",
  userProfile = null,
}) {
  const [loading, setLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [currentUser, setCurrentUser] = useState(userProfile);

  const [personal, setPersonal] = useState({
    firstName: "",
    lastName: "",
    dob: "",
    email: "",
    phone: "",
    role: "",
    location: "",
    avatar: "",
    trusts: [],
  });

  const [address, setAddress] = useState({
    country: "",
    city: "",
    postalCode: "",
  });

  const [personalEditing, setPersonalEditing] = useState(false);
  const storageKey = `profile_${username}`;

  const normalizeTrusts = (source = {}, fallbackTrusts = []) => {
    if (Array.isArray(source?.trusts) && source.trusts.length > 0) {
      return source.trusts;
    }

    if (Array.isArray(source?.trustIds) && source.trustIds.length > 0) {
      return source.trustIds.map((id) => ({
        id,
        name: `Trust ${id}`,
      }));
    }

    return fallbackTrusts;
  };

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setSaveMessage("");

      const saved = localStorage.getItem(storageKey);
      let parsedSaved = null;

      if (saved) {
        try {
          parsedSaved = JSON.parse(saved);
        } catch (error) {
          console.error("Error reading profile from localStorage", error);
        }
      }

      const buildPersonal = (source) => ({
        firstName: source?.firstName ?? username,
        lastName: source?.lastName ?? "",
        dob: source?.dob ?? "",
        email: source?.email ?? "",
        phone:
          source?.mobile !== undefined && source?.mobile !== null
            ? String(source.mobile)
            : parsedSaved?.personal?.phone ?? "",
        role: ROLE_LABELS[source?.roleId] || source?.role || defaultRole,
        location: source?.location ?? parsedSaved?.personal?.location ?? "",
        avatar: parsedSaved?.personal?.avatar ?? "",
        trusts: normalizeTrusts(
          source,
          parsedSaved?.personal?.trusts || userProfile?.trusts || []
        ),
      });

      const savedAddress = {
        country: parsedSaved?.address?.country ?? "",
        city: parsedSaved?.address?.city ?? "",
        postalCode: parsedSaved?.address?.postalCode ?? "",
      };

      try {
        if (userProfile?.id) {
          const res = await getUser(userProfile.id);
          const apiUser = res.data;
          setCurrentUser(apiUser);
          setPersonal(buildPersonal(apiUser));
          setAddress(savedAddress);
          localStorage.setItem("loggedInUser", JSON.stringify(apiUser));
          localStorage.setItem(
            storageKey,
            JSON.stringify({
              personal: {
                ...parsedSaved?.personal,
                ...buildPersonal(apiUser),
              },
              address: savedAddress,
            })
          );
        } else {
          setCurrentUser(userProfile);
          setPersonal(buildPersonal(userProfile));
          setAddress(savedAddress);
        }
      } catch (error) {
        console.error("Error fetching profile from API", error);
        setCurrentUser(userProfile);
        setPersonal(buildPersonal(userProfile));
        setAddress(savedAddress);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [storageKey, username, defaultRole, userProfile]);

  const saveToLocalStorage = (
    nextPersonal = personal,
    nextAddress = address
  ) => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        personal: nextPersonal,
        address: nextAddress,
      })
    );
    setTimeout(() => setSaveMessage(""), 2500);
  };

  const getRoleIdFromLabel = (roleLabel) =>
    Number(
      Object.entries(ROLE_LABELS).find(([, label]) => label === roleLabel)?.[0]
    ) || null;

  const handlePersonalChange = (field, value) => {
    setPersonal((prev) => ({ ...prev, [field]: value }));
  };

  const handleStartPersonalEdit = () => {
    setSaveError("");
    setPersonalEditing(true);
  };

  const handleSavePersonal = async () => {
    setSaveError("");

    if (!userProfile?.id) {
      saveToLocalStorage();
      setSaveMessage("Profile saved locally");
      setPersonalEditing(false);
      return;
    }

    const roleId =
      getRoleIdFromLabel(personal.role) ??
      currentUser?.roleId ??
      userProfile?.roleId ??
      0;

    try {
      setSavingPersonal(true);
      const latestUserResponse = await getUser(userProfile.id);
      const latestUser = latestUserResponse.data;
      setCurrentUser(latestUser);

      const editedTrustIds = (personal.trusts || [])
        .map((trust) => Number(trust?.id))
        .filter((id) => Number.isInteger(id));

      const existingTrustIds = normalizeTrusts(
        latestUser,
        userProfile?.trusts || []
      )
        .map((trust) => Number(trust?.id))
        .filter((id) => Number.isInteger(id));

      const payload = {
        ...latestUser,
        email: personal.email.trim(),
        firstName: personal.firstName.trim(),
        lastName: personal.lastName.trim(),
        mobile: Number(personal.phone),
        roleId,
        trustIds: editedTrustIds.length > 0 ? editedTrustIds : existingTrustIds,
        username:
          latestUser?.username ||
          personal.email.trim() ||
          userProfile?.username ||
          "",
      };

      console.log("Profile update payload:", payload);

      const res = await updateUser(userProfile.id, payload);
      const updatedUser = {
        ...latestUser,
        ...(res?.data || {}),
        ...payload,
        trusts: normalizeTrusts(res?.data || latestUser, personal.trusts),
      };

      const nextPersonal = {
        ...personal,
        trusts: updatedUser.trusts,
      };

      setCurrentUser(updatedUser);
      setPersonal(nextPersonal);
      saveToLocalStorage(nextPersonal, address);
      localStorage.setItem("loggedInUser", JSON.stringify(updatedUser));
      setSaveMessage("Profile updated successfully");
      setPersonalEditing(false);
    } catch (error) {
      console.error("Error updating profile", error);
      setSaveError(
        error.response?.data?.message ||
          error.response?.data?.error ||
          error.response?.data ||
          "Failed to update profile"
      );
    } finally {
      setSavingPersonal(false);
      setTimeout(() => setSaveMessage(""), 2500);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const nextPersonal = { ...personal, avatar: dataUrl };
      setPersonal(nextPersonal);
      saveToLocalStorage(nextPersonal, address);
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarRemove = () => {
    const nextPersonal = { ...personal, avatar: "" };
    setPersonal(nextPersonal);
    saveToLocalStorage(nextPersonal, address);
  };

  const fullName =
    `${personal.firstName || ""} ${personal.lastName || ""}`.trim() ||
    username;
  const trustNames =
    personal.trusts?.map((trust) => trust.name).filter(Boolean).join(", ") ||
    "-";

  if (loading) {
    return (
      <div className="profile-page">
        <h2 className="profile-page-title">My Profile</h2>
        <div className="profile-card">
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="content">
      <div className="profile-page">
        <h2 className="profile-page-title">My Profile</h2>

        {saveMessage && (
          <div className="profile-save-message success">{saveMessage}</div>
        )}
        {saveError && <div className="profile-save-message error">{saveError}</div>}

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

        <section className="profile-section">
          <div className="section-header">
            <h3>Personal Information</h3>
            <button
              type="button"
              className="section-edit-btn"
              onClick={() =>
                personalEditing ? handleSavePersonal() : handleStartPersonalEdit()
              }
              disabled={savingPersonal}
            >
              {savingPersonal ? "Saving..." : personalEditing ? "Save" : "Edit"}
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
              <span className="field-label">Role</span>
              {personalEditing ? (
                <input
                  type="text"
                  value={personal.role}
                  onChange={(e) => handlePersonalChange("role", e.target.value)}
                />
              ) : (
                <span className="field-value">{personal.role || "-"}</span>
              )}
            </div>

            <div className="field">
              <span className="field-label">Email Address</span>
              {personalEditing ? (
                <input
                  type="email"
                  value={personal.email}
                  onChange={(e) => handlePersonalChange("email", e.target.value)}
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
                  onChange={(e) => handlePersonalChange("phone", e.target.value)}
                />
              ) : (
                <span className="field-value">{personal.phone || "-"}</span>
              )}
            </div>

            <div className="field">
              <span className="field-label">Trusts</span>
              <span className="field-value trusts-value">{trustNames}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
