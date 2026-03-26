// Header.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import SettingsPanel from "./SettingsPanel";
import optimonLogo from "../assets/Optimon_logo.png";
import logo from "../assets/logo.png";
import refreshIcon from "../assets/refresh.png";
import "./Header.css";

export default function Header({
  refreshTime,
  onRefreshTimeChange,
  gridCount,
  onGridCountChange,
  maxGridCount,
  isAdminUser,
  username,
  userProfile,
  queueWarningLimit,
  onQueueWarningLimitChange,
  serviceDelayLimit,
  onServiceDelayLimitChange,
  selectedTrustIds,
  onTrustChange,
  trustData,
  onRefresh,
  onLogout,
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const userIconRef = useRef(null);
  const firstName = userProfile?.firstName?.trim() || "";
  const lastName = userProfile?.lastName?.trim() || "";
  const hasFullName = Boolean(firstName || lastName);
  const displayName = hasFullName
    ? `${firstName} ${lastName}`.trim()
    : username || "user";
  const stackLastName = hasFullName && displayName.length > 18 && Boolean(lastName);

  const handlePageRefresh = async () => {
  if (isRefreshing) return;

  console.log("Refresh icon clicked");

  setIsRefreshing(true);

  try {
    await onRefresh();
    console.log("Header refresh completed successfully");
  } catch (error) {
    console.error("Refresh failed:", error);
  } finally {
    setIsRefreshing(false);
  }
};

  /* ================= TRUST LIST ================= */
  // const trustList = trustData || [];

  const trustList = useMemo(() => {
    const map = new Map();

    trustData.forEach((item) => {
      const inbound = item?.inboundDetails?.[0];
      if (inbound?.trustId) {
        map.set(
          inbound.trustId,
          inbound.trustName || `Trust ${inbound.trustId}`
        );
      }
    });

    return Array.from(map.entries()).map(([trustId, trustName]) => ({
      trustId,
      trustName,
    }));
  }, [trustData]);

  /* HEADER TRUSTS (FIRST 3 + LAST) */
  const headerTrustList = useMemo(() => {
    if (trustList.length <= 4) {
      return trustList;
    }

    const firstThree = trustList.slice(0, 3);
    const lastOne = trustList.slice(-1);

    return [...firstThree, ...lastOne];
  }, [trustList]);

  const toggleDropdown = () => setIsDropdownOpen((s) => !s);
  const toggleSettings = () => setIsSettingsOpen((s) => !s);

  const closeAllDropdowns = () => {
    setIsSettingsOpen(false);
    setIsDropdownOpen(false);
  };

  useEffect(() => {
    if (!isDropdownOpen) return;

    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        userIconRef.current &&
        !userIconRef.current.contains(e.target)
      ) {
        closeAllDropdowns();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropdownOpen]);

  const goHome = () => {
    closeAllDropdowns();

    if (window.location.pathname === "/action") {
      window.location.reload();
    } else {
      navigate("/action");
      // setTimeout(() => {
        window.location.reload();
      // }, 100); 
    }
  };

  const goToAdmin = () => {
    closeAllDropdowns();
    navigate("/admin");
  };

  const goToProfile = () => {
    closeAllDropdowns();
    navigate("/profile");
  };

  const handleLogout = () => {
    closeAllDropdowns();
    onLogout?.();
  };

 const handleTrustChange = (e) => {
  let values = Array.from(
    e.target.selectedOptions,
    (option) => option.value
  );

  const hadAllBefore = selectedTrustIds.includes("ALL");

  const hasAllNow = values.includes("ALL");

  const allTrustIds = headerTrustList.map((t) =>
    String(t.trustId)
  );

  if (!hadAllBefore && hasAllNow) {
    values = ["ALL"];
  }

  else if (hadAllBefore && !hasAllNow) {
  }

  else if (hasAllNow && values.length > 1) {
    values = values.filter((v) => v !== "ALL");
  }

  const selectedWithoutAll = values.filter(
    (v) => v !== "ALL"
  );

  if (
    selectedWithoutAll.length === allTrustIds.length &&
    allTrustIds.length > 0
  ) {
    values = ["ALL"];
  }

  if (values.length === 0) {
    values = ["ALL"];
  }

  onTrustChange(values);
};

  return (
    <div className="Header">
      <img
        src={optimonLogo}
        alt="Optimon Logo"
        className="optimon-logo"
        onClick={goHome}
      />

      {/* Mobile Logo */}
      <img
        src={logo}
        alt="Logo"
        className="logo"
        onClick={goHome}
      />

      <p className="nav">OPTIMON+</p>

      <div className="user-menu">
        {/* TRUST SELECTOR */}
        <div className="trust-selector">
          <img
            src={refreshIcon}
            alt="refresh"
            className={`refresh-icon ${isRefreshing ? "rotate" : ""}`}
            onClick={handlePageRefresh}
          />

          <select
            multiple
            size="1"
            value={selectedTrustIds}
            onChange={handleTrustChange}
          >
            <option value="ALL">All Trusts</option>

            {headerTrustList.map((t) => (
              <option key={t.trustId} value={t.trustId}>
                {t.trustName}
              </option>
            ))}
          </select>
        </div>

        {/* USER INFO */}
        <div className="user-menu">
          <p className="welcome">
            <span className="welcome-label">Welcome,</span>
            {hasFullName ? (
              <span className="welcome-name">
                <span>{firstName || lastName}</span>
                {lastName && firstName && (
                  <span className={stackLastName ? "welcome-last-line" : ""}>
                    {lastName}
                  </span>
                )}
              </span>
            ) : (
              <span className="welcome-name">
                <span>{displayName}</span>
              </span>
            )}
          </p>

          <i
            ref={userIconRef}
            className="fa-solid fa-user"
            onClick={toggleDropdown}
            style={{ cursor: "pointer" }}
          />
        </div>
      </div>

      {/* DROPDOWN */}
      {isDropdownOpen && (
        <div className="dropdown" ref={dropdownRef}>
          <ul>
            <li className="dropdown-item" onClick={goHome}>
              <i className="ri-home-4-line" /> Home
            </li>

            {isAdminUser && (
              <li className="dropdown-item" onClick={goToAdmin}>
                <i className="ri-shield-user-line" /> Admin
              </li>
            )}

            <li className="dropdown-item" onClick={goToProfile}>
              <i className="ri-user-line" /> Profile
            </li>

            <li className="dropdown-item" onClick={toggleSettings}>
              <i className="ri-settings-3-line" /> Settings
              <i
                className={
                  isSettingsOpen
                    ? "ri-arrow-drop-down-line arrow"
                    : "ri-arrow-drop-right-line arrow"
                }
              />
            </li>

            {isSettingsOpen && (
              <SettingsPanel
                refreshTime={refreshTime}
                gridCount={gridCount}
                queueWarningLimit={queueWarningLimit}
                serviceDelayLimit={serviceDelayLimit}
                maxGridCount={maxGridCount}
                selectedTrustIds={selectedTrustIds}
                onTrustChange={onTrustChange}
                trustList={trustList}
                onRefreshTimeChange={onRefreshTimeChange}
                onGridCountChange={onGridCountChange}
                onQueueWarningLimitChange={onQueueWarningLimitChange}
                onServiceDelayLimitChange={onServiceDelayLimitChange}
                onSave={closeAllDropdowns}
                onClose={() => setIsSettingsOpen(false)}
              />
            )}

            <li className="dropdown-item" onClick={handleLogout}>
              <i className="ri-logout-box-r-line" /> Logout
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
