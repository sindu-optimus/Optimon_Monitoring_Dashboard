import React, { useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import "./Sidebar.css";
import "remixicon/fonts/remixicon.css";

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const [hovered, setHovered] = useState(null);
  const [isOpen, setIsOpen] = useState(false);      // mobile open/close
  const [isCollapsed, setIsCollapsed] = useState(false); // desktop collapse

  const menuItems = [
    { name: "Dashboard", path: "dashboard", icon: "ri-dashboard-line", activeIcon: "ri-dashboard-fill" },
    { name: "Add Trust", path: "trusts", icon: "ri-shield-check-line", activeIcon: "ri-shield-check-fill" },
    { name: "Message Bank", path: "message-bank", icon: "ri-search-line", activeIcon: "ri-search-fill" },
    { name: "Message Trend", path: "message-trend", icon: "ri-file-chart-line", activeIcon: "ri-file-chart-fill" },
    { name: "View Actions", path: "view-actions", icon: "ri-history-line", activeIcon: "ri-history-fill" },
    { name: "Add Action", path: "add-action", icon: "ri-add-line", activeIcon: "ri-add-fill" },
    { name: "Send Email", path: "send-email", icon: "ri-send-plane-line", activeIcon: "ri-send-plane-fill" },
    { name: "FAQs", path: "faqs", icon: "ri-question-line", activeIcon: "ri-question-fill" },
    { name: "Profile", path: "profile", icon: "ri-user-line", activeIcon: "ri-user-fill" },
  ];

  const handleNavigate = (subPath) => {
    if (!id) return;
    navigate(`/action/${id}/${subPath}`);
    setIsOpen(false); // close sidebar on mobile after click
  };

  return (
    <>
      {/* SIDEBAR */}
      <div className={`sidebar ${isOpen ? "open" : ""} ${isCollapsed ? "collapsed" : ""}`}>
        
        {/* HEADER */}
        <div className="sidebar-header">
          {!isCollapsed && <h2 className="sidebar-head">Action Center</h2>}

          {/* Desktop collapse button */}
          <button
            className="collapse-btn"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <i className={isCollapsed ? "ri-menu-line" : "ri-menu-line"} /> 
          </button>

          {/* Mobile close button */}
          <button
            className="mobile-close-btn"
            onClick={() => setIsOpen(false)}
          >
            <i className="ri-close-line" />
          </button>
        </div>

        {/* MENU */}
        <ul>
          {menuItems.map((item) => {
            const fullPath = `/action/${id}/${item.path}`;
            const isActive = location.pathname === fullPath;

            return (
              <li
                key={item.name}
                className={isActive ? "active" : ""}
                onClick={() => handleNavigate(item.path)}
                onMouseEnter={() => setHovered(item.name)}
                onMouseLeave={() => setHovered(null)}
              >
                <div className="menu-item">
                  <i
                    className={`sidebar-icon ${
                      hovered === item.name || isActive
                        ? item.activeIcon
                        : item.icon
                    }`}
                  />

                  {!isCollapsed && (
                    <span className="menu-label">{item.name}</span>
                  )}

                  {isCollapsed && (
                    <span className="tooltip">{item.name}</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* MOBILE HAMBURGER (only when sidebar is closed) */}
      {!isOpen && (
        <div className="sidebar-toggle-btn" onClick={() => setIsOpen(true)}>
          <i className="ri-menu-line"></i>
        </div>
      )}
    </>
  );
}
