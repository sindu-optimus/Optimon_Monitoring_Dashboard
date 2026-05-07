import React from "react";
import Sidebar from "../components/Sidebar"; 
import bgVideo from "../assets/servers-bg.mp4";
import "./SidebarLayout.css";

export default function SidebarLayout({ children }) {
  return (
    <div className="page-layout standard-page-layout">
      <video className="standard-bg-video" autoPlay muted loop playsInline>
        <source src={bgVideo} type="video/mp4" />
      </video>
      <div className="standard-video-overlay" />

      <Sidebar />
      <div className="page-content standard-page-content">
        <div className="standard-content-layer">
          {children}
        </div>
      </div>
    </div>
  );
}
