import { Outlet } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import "./SidebarLayout.css";

export default function AdminLayout({ isAdminUser = false }) {
  return (
    <div className="page-layout">
      <AdminSidebar isAdminUser={isAdminUser} />
      <div className="page-content">
        <Outlet />
      </div>
    </div>
  );
}
