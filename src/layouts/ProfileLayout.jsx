// layouts/ProfileLayout.jsx
import { Outlet } from "react-router-dom";

export default function ProfileLayout() {
  return (
    <div className="page-layout">
      <div className="page-content">
        <Outlet />
      </div>
    </div>
  );
}
