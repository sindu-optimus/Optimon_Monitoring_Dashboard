// AdminSidebar.jsx
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Sidebar.css";
import "remixicon/fonts/remixicon.css";

export default function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [hovered, setHovered] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false); 
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { name: "Profile", path: "/admin/profile", icon: "ri-user-line", activeIcon: "ri-user-fill" },
    { name: "Trusts List", path: "/admin/add-trusts", icon: "ri-shield-check-line", activeIcon: "ri-shield-check-fill" },
    { name: "Support Actions", path: "/admin/support-actions", icon: "ri-history-line", activeIcon: "ri-history-fill" },
    { name: "Send Mail", path: "/admin/send-email", icon: "ri-send-plane-line", activeIcon: "ri-send-plane-fill" },
    { name: "FAQs", path: "/admin/faqs", icon: "ri-question-line", activeIcon: "ri-question-fill" },
    { name: "Users", path: "/admin/add-users", icon: "ri-team-line", activeIcon: "ri-team-fill" },
    { name: "Interfaces", path: "/admin/summary-interfaces", icon: "ri-bar-chart-line", activeIcon: "ri-bar-chart-fill" },
    { name: "Settings", path: "/admin/settings", icon: "ri-settings-3-line", activeIcon: "ri-settings-3-fill" },
  ];

  const handleNavigate = (path) => {
    navigate(path);
    setIsOpen(false); 
  };

  return (
    <>
      {/* SIDEBAR */}
      <div className={`sidebar ${isOpen ? "open" : ""} ${isCollapsed ? "collapsed" : ""}`}>
        
        {/* HEADER */}
        <div className="sidebar-header">
          {!isCollapsed && <h2 className="sidebar-head">Admin</h2>}

          {/* Desktop collapse */}
          <button
            className="collapse-btn"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <i className={isCollapsed ? "ri-menu-line" : "ri-menu-line"} /> 
          </button>

          {/* Mobile close */}
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
            const isActive = location.pathname === item.path;

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

                  {!isCollapsed && <span className="menu-label">{item.name}</span>}

                  {isCollapsed && <span className="tooltip">{item.name}</span>}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* MOBILE HAMBURGER */}
      {!isOpen && (
        <div className="sidebar-toggle-btn" onClick={() => setIsOpen(true)}>
          <i className="ri-menu-line"></i>
        </div>
      )}
    </>
  );
}
