import React from "react";
import Sidebar from "../components/Sidebar"; 
import "./SidebarLayout.css";

export default function SidebarLayout({ children }) {
  return (
    <div className="page-layout">
      <Sidebar />
      <div className="page-content">
        {children}
      </div>
    </div>
  );
}
