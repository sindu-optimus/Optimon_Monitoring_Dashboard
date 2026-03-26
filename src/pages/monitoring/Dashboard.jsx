import React, { useEffect, useState } from "react";
import { Line, Pie } from "react-chartjs-2";
import { useParams } from "react-router-dom";
import "chart.js/auto";
import "./Dashboard.css";

const Dashboard = () => {
  const { id } = useParams();
  const [dashboardData, setDashboardData] = useState(null);

  const mockDashboardData = {
    status: "Healthy",

    lastEmail: {
      sent: true,
      time: "Dec 23, 2025 10:42 AM",
    },

    recentActions: [
      {
        time: "10:40 AM",
        action: "Message processed successfully",
        user: "System",
      },
      {
        time: "10:35 AM",
        action: "Retry triggered for failed message",
        user: "Admin",
      },
      {
        time: "10:20 AM",
        action: "Interface restarted",
        user: "Sindu",
      },
      {
        time: "10:05 AM",
        action: "Configuration updated",
        user: "Admin",
      },
    ],

    messageTrendData: {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      datasets: [
        {
          label: "Messages",
          data: [120, 190, 300, 250, 220, 180, 260],
          fill: false,
          borderColor: "#4CAF50",
          tension: 0.4,
        },
      ],
    },

    errorSuccessData: {
      labels: ["Success", "Error"],
      datasets: [
        {
          data: [92, 8],
          backgroundColor: ["#2ecc71", "#e74c3c"],
        },
      ],
    },
  };

  useEffect(() => {
    // ⏳ simulate API delay
    const timer = setTimeout(() => {
      setDashboardData(mockDashboardData);
    }, 500);

    return () => clearTimeout(timer);
  }, [id]);

  if (!dashboardData) return <p>Loading data...</p>;

  const {
    recentActions,
    lastEmail,
    messageTrendData,
    errorSuccessData,
    status,
  } = dashboardData;

  return (
    <div className="content">
      <h2>{id ? `Dashboard - ${id}` : "Interface Dashboard"}</h2>

      {/* Status Cards */}
      <div className="status-cards">
        <div className={`status-card ${status.toLowerCase()}`}>
          <h3>Status</h3>
          <p>{status}</p>
        </div>

        <div className="status-card">
          <h3>Last Email</h3>
          <p>{lastEmail?.sent ? `Sent: ${lastEmail.time}` : "Not Sent"}</p>
        </div>
      </div>

      {/* ✅ Charts */}
      <div className="chart-section">
        <div className="chart-card">
          <h3>Message Volume Trend</h3>
          <Line data={messageTrendData} />
        </div>

        <div className="chart-card">
          <h3>Error vs Success</h3>
          <Pie data={errorSuccessData} />
        </div>
      </div>

      <div className="actions-section">
        <h3>Recent Actions</h3>
        <ul>
          {recentActions.map((item, index) => (
            <li key={index}>
              <strong>{item.time}</strong>: {item.action} (by {item.user})
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Dashboard;


