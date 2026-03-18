// ServerDetails.jsx
import { useParams, useNavigate, Outlet } from "react-router-dom";
import SidebarLayout from "../../layouts/SidebarLayout";
import "./ServerDetails.css";

export default function ServerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <SidebarLayout>
      <div className="main-container">
        <div className="main">
          <div className="left-icons">
            <div onClick={() => navigate("/action")} className="icon">
              <i className="fa-solid fa-less-than"></i>
              <span className="tooltip-text">Back</span>
            </div>
          </div>

          <h3 className="name">{id}</h3>
        </div>

        <hr />

        <div className="server-details-content">
          <Outlet />
        </div>
      </div>
    </SidebarLayout>
  );
}
