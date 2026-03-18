// App.jsx
import React, { useState, useEffect } from "react";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";

import Header from "./components/Header";
import Footer from "./components/Footer";
import ProfileLayout from "./layouts/ProfileLayout";
import AdminLayout from "./layouts/AdminLayout";
import Login from "./pages/auth/Login";
import About from "./pages/public/About";
import Contact from "./pages/public/Contact";
import Servers from "./pages/monitoring/Servers";
import ServerDetails from "./pages/monitoring/ServerDetails";
import Dashboard from "./pages/monitoring/Dashboard";
import AddTrust from "./pages/admin/AddTrust";
import AddUser from "./pages/admin/AddUser";
import TrustSupport from "./pages/admin/TrustSupport";
import Profile from "./pages/admin/Profile";
import SummaryInterfaces from "./pages/admin/SummaryInterfaces";
import SettingsPage from "./pages/admin/SettingsPage";

import MessageBank from "./pages/shared/MessageBank";
import ViewActions from "./pages/shared/ViewActions";
import AddActions from "./pages/shared/AddActions";
import SendMail from "./pages/shared/SendMail";
import FAQ from "./pages/shared/FAQ";
import MessageTrend from "./pages/shared/MessageTrend";

import "./App.css";

export default function App() {
  /* ===================== STATE ===================== */
  const [refreshTime, setRefreshTime] = useState(60);
  const [gridCount, setGridCount] = useState(3);
  const [queueWarningLimit, setQueueWarningLimit] = useState(100);
  const [serviceDelayLimit, setServiceDelayLimit] = useState(100);
  const [selectedTrustIds, setSelectedTrustIds] = useState(["ALL"]);
  const [isLoggedIn, setIsLoggedIn] = useState(
    localStorage.getItem("isLoggedIn") === "true"
  );
  const [username, setUsername] = useState(
    localStorage.getItem("username") || ""
  );
  const [allTrustData, setAllTrustData] = useState([]);
  const [trustIds, setTrustIds] = useState([]);

  const navigate = useNavigate();
  const location = useLocation();

  /* ===================== HELPERS ===================== */
  function sortTrustDataById(dataList) {
    return [...dataList].sort((a, b) => {
      const trustA =
        a?.inboundDetails?.[0]?.trustId ?? Number.MAX_SAFE_INTEGER;
      const trustB =
        b?.inboundDetails?.[0]?.trustId ?? Number.MAX_SAFE_INTEGER;
      return trustA - trustB;
    });
  }

  async function fetchTrustMetrics(trustId) {
    try {
      const res = await fetch(
        `http://18.168.87.76:8084/getMetricDetails/?trustId=${trustId}`
      );
      if (!res.ok) throw new Error();

      const data = await res.json();
      return data?.inboundDetails || data?.queueDetails ? data : null;
    } catch {
      return null;
    }
  }

  /* ===================== PROGRESSIVE FETCH ===================== */
  async function fetchTrustsProgressively(ids, append = false) {
    ids.forEach(async (id) => {
      const data = await fetchTrustMetrics(id);
      if (!data) return;

      setAllTrustData((prev) => {
        const trustId = data?.inboundDetails?.[0]?.trustId;

        const exists = prev.some(
          (item) =>
            item?.inboundDetails?.[0]?.trustId === trustId
        );

        if (exists && append) return prev;

        let updated;

        if (append) {
          updated = [...prev, data];
        } else {
          updated = [
            ...prev.filter(
              (item) =>
                item?.inboundDetails?.[0]?.trustId !== trustId
            ),
            data,
          ];
        }

        return sortTrustDataById(updated);
      });
    });
  }

  /* ===================== INITIAL LOAD ===================== */
  useEffect(() => {
    if (!isLoggedIn) return;

    const ids = Array.from({ length: gridCount }, (_, i) => i + 1);
    setTrustIds(ids);
    setAllTrustData([]); // clear old

    fetchTrustsProgressively(ids);
  }, [isLoggedIn]);

  /* ===================== GRID CHANGE ===================== */
  useEffect(() => {
    if (!isLoggedIn) return;

    setTrustIds((prevIds) => {
      // Decrease grid
      if (gridCount <= prevIds.length) {
        const updatedIds = prevIds.slice(0, gridCount);

        setAllTrustData((prev) =>
          sortTrustDataById(prev).slice(0, gridCount)
        );

        return updatedIds;
      }

      // Increase grid
      const newIds = Array.from(
        { length: gridCount - prevIds.length },
        (_, i) => prevIds.length + i + 1
      );

      fetchTrustsProgressively(newIds, true);

      return [...prevIds, ...newIds];
    });
  }, [gridCount]);

  /* ===================== AUTO REFRESH ===================== */
  useEffect(() => {
    if (!isLoggedIn || trustIds.length === 0) return;

    const intervalMs = (Number(refreshTime)) * 1000;

    const timer = setInterval(() => {
      fetchTrustsProgressively(trustIds);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isLoggedIn, refreshTime, trustIds]);

  /* ===================== LOGIN ===================== */
  const handleLogin = (uname) => {
    setIsLoggedIn(true);
    setUsername(uname);
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("username", uname);
    navigate("/action");
  };

  const showHeaderAndFooter = !["/login", "/about", "/contact"].includes(
    location.pathname
  );

  /* ===================== UI ===================== */
  return (
    <div>
      {showHeaderAndFooter && (
        <Header
          refreshTime={refreshTime}
          onRefreshTimeChange={setRefreshTime}
          gridCount={gridCount}
          onGridCountChange={setGridCount}
          username={username}
          queueWarningLimit={queueWarningLimit}
          onQueueWarningLimitChange={setQueueWarningLimit}
          serviceDelayLimit={serviceDelayLimit}
          onServiceDelayLimitChange={setServiceDelayLimit}
          selectedTrustIds={selectedTrustIds}
          onTrustChange={setSelectedTrustIds}
          trustData={allTrustData}
          onRefresh={() => fetchTrustsProgressively(trustIds)}
        />
      )}

      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />

        <Route
          path="/action"
          element={
            isLoggedIn ? (
              <Servers
                gridCount={gridCount}
                queueWarningLimit={queueWarningLimit}
                serviceDelayLimit={serviceDelayLimit}
                jsonData={allTrustData}
                selectedTrustIds={selectedTrustIds}
              />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/action/:id"
          element={isLoggedIn ? <ServerDetails /> : <Navigate to="/login" />}
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="trusts" element={<AddTrust />} />
          <Route path="message-bank" element={<MessageBank />} />
          <Route path="message-trend" element={<MessageTrend />} />
          <Route path="view-actions" element={<ViewActions />} />
          <Route path="add-action" element={<AddActions username={username} />} />
          <Route path="send-email" element={<SendMail />} />
          <Route path="faqs" element={<FAQ />} />
          <Route path="profile" element={<Profile username={username} />} />
        </Route>

        <Route
          element={isLoggedIn ? <ProfileLayout /> : <Navigate to="/login" />}
        >
          <Route path="/profile" element={<Profile username={username} />} />
        </Route>

        <Route
          path="/admin"
          element={isLoggedIn ? <AdminLayout /> : <Navigate to="/login" />}
        >
          <Route index element={<Navigate to="profile" replace />} />
          <Route path="profile" element={<Profile username={username} />} />
          <Route path="add-trusts" element={<AddTrust />} />
          <Route path="add-users" element={<AddUser />} />
          <Route path="summary-interfaces" element={<SummaryInterfaces />} />
          <Route
            path="trust-support"
            element={<TrustSupport trustData={allTrustData} />}
          />
          <Route
            path="settings"
            element={
              <SettingsPage
                refreshTime={refreshTime}
                onRefreshTimeChange={setRefreshTime}
                gridCount={gridCount}
                onGridCountChange={setGridCount}
                selectedTrustIds={selectedTrustIds}
                onTrustChange={setSelectedTrustIds}
                queueWarningLimit={queueWarningLimit}
                onQueueWarningLimitChange={setQueueWarningLimit}
                serviceDelayLimit={serviceDelayLimit}
                onServiceDelayLimitChange={setServiceDelayLimit}
              />
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>

      {showHeaderAndFooter && <Footer />}
    </div>
  );
}