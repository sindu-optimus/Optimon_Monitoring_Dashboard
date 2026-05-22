// ServerDetails.jsx
import { useParams, useNavigate, Outlet, useLocation } from "react-router-dom";
import SidebarLayout from "../../layouts/SidebarLayout";
import "remixicon/fonts/remixicon.css";
import "./ServerDetails.css";

export default function ServerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const { queueName: stateQueueName, aliasName: stateAliasName } =
    location.state || {};
  const {
    trustId: stateTrustId,
    trustName: stateTrustName,
    serviceName: stateServiceName,
    interfaceName: stateInterfaceName,
    direction: stateDirection,
  } = location.state || {};
  const queueName = stateQueueName || searchParams.get("queueName");
  const aliasName = stateAliasName || searchParams.get("aliasName");
  const trustId = stateTrustId || searchParams.get("trustId");
  const trustName = stateTrustName || searchParams.get("trustName");
  const serviceName = stateServiceName || searchParams.get("serviceName");
  const interfaceName =
    stateInterfaceName ||
    searchParams.get("interfaceName") ||
    serviceName ||
    queueName ||
    aliasName ||
    id;
  const direction = stateDirection || searchParams.get("direction");
  const originalName = serviceName || queueName;
  const displayName =
    aliasName && originalName ? `${aliasName} (${originalName})` : aliasName || id;
  const openSendMailForm = () => {
    if (!id) return;

    navigate(`/action/${encodeURIComponent(id)}/send-email${location.search}`, {
      state: {
        ...location.state,
        queueName,
        aliasName,
        trustId,
        trustName,
        serviceName,
        interfaceName,
        direction,
      },
    });
  };

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

          <h3 className="name">{displayName}</h3>

          <button
            type="button"
            className="server-mail-btn"
            onClick={openSendMailForm}
            title="Open send mail form"
            aria-label="Open send mail form"
          >
            <i className="ri-mail-send-line"></i>
          </button>
        </div>

        <hr />

        <div className="server-details-content">
          <Outlet />
        </div>
      </div>
    </SidebarLayout>
  );
}
