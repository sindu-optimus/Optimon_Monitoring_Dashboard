import { Outlet } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import bgVideo from "../assets/servers-bg.mp4";
import "./SidebarLayout.css";
import "./AdminLayout.css";

export default function AdminLayout({ isAdminUser = false }) {
  return (
    <div className="page-layout admin-page-layout">
      <video className="admin-bg-video" autoPlay muted loop playsInline>
        <source src={bgVideo} type="video/mp4" />
      </video>
      <div className="admin-video-overlay" />

      <AdminSidebar isAdminUser={isAdminUser} />

      <div className="page-content admin-page-content">
        <div className="admin-content-layer">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
