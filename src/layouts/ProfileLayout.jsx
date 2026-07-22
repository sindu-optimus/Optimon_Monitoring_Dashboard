// layouts/ProfileLayout.jsx
import { Outlet } from "react-router-dom";
import bgVideo from "../assets/servers-bg.mp4";
import "./ProfileLayout.css";

export default function ProfileLayout() {
  return (
    <div className="page-layout profile-page-layout">
      <video className="profile-bg-video" autoPlay muted loop playsInline>
        <source src={bgVideo} type="video/mp4" />
      </video>
      <div className="profile-video-overlay" />

      <div className="page-content profile-page-content">
        <div className="profile-content-layer">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
