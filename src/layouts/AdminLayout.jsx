import { Outlet } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import "./SidebarLayout.css";

export default function AdminLayout() {
  return (
    <div className="page-layout">
      <AdminSidebar />
      <div className="page-content">
        <Outlet />
      </div>
    </div>
  );
}
