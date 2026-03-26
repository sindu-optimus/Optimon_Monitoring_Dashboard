// App.jsx
import React, { useState, useEffect, useMemo } from "react";
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
import Profile from "./pages/admin/Profile";
import SummaryInterfaces from "./pages/admin/SummaryInterfaces";
import SettingsPage from "./pages/admin/SettingsPage";

import MessageBank from "./pages/shared/MessageBank";
import SupportActions from "./pages/shared/SupportActions";
import SendMail from "./pages/shared/SendMail";
import FAQ from "./pages/shared/FAQ";
import MessageTrend from "./pages/shared/MessageTrend";
import { getTrustMeta } from "./utils/trustData";

import "./App.css";

export default function App() {
  /* ===================== STATE ===================== */
  const DEFAULT_REFRESH_TIME = 60;
  const DEFAULT_GRID_COUNT = 3;
  const DEFAULT_QUEUE_WARNING_LIMIT = 100;
  const DEFAULT_SERVICE_DELAY_LIMIT = 100;

  const [refreshTime, setRefreshTime] = useState(DEFAULT_REFRESH_TIME);
  const [gridCount, setGridCount] = useState(DEFAULT_GRID_COUNT);
  const [queueWarningLimit, setQueueWarningLimit] = useState(
    DEFAULT_QUEUE_WARNING_LIMIT
  );
  const [serviceDelayLimit, setServiceDelayLimit] = useState(
    DEFAULT_SERVICE_DELAY_LIMIT
  );
  const [selectedTrustIds, setSelectedTrustIds] = useState(["ALL"]);
  const [isLoggedIn, setIsLoggedIn] = useState(
    localStorage.getItem("isLoggedIn") === "true"
  );
  const [username, setUsername] = useState(
    localStorage.getItem("username") || ""
  );
  const [loggedInUser, setLoggedInUser] = useState(() => {
    const storedUser = localStorage.getItem("loggedInUser");
    if (!storedUser) return null;

    try {
      return JSON.parse(storedUser);
    } catch {
      return null;
    }
  });
  const [sessionPassword, setSessionPassword] = useState(
    () => sessionStorage.getItem("sessionPassword") || ""
  );
  const [allTrustData, setAllTrustData] = useState([]);
  const [trustIds, setTrustIds] = useState([]);
  const isAdminUser =
    Number(loggedInUser?.roleId) === 1 ||
    String(loggedInUser?.role || "").toLowerCase() === "admin";

  const allowedTrustIds = useMemo(() => {
    const userTrustIds =
      loggedInUser?.trusts
        ?.map((trust) => trust?.id)
        .filter((id) => Number.isFinite(Number(id)))
        .map(Number)
        .sort((a, b) => a - b) || [];

    if (userTrustIds.length > 0) {
      return userTrustIds;
    }

    return Array.from({ length: gridCount }, (_, i) => i + 1);
  }, [loggedInUser, gridCount]);

  const maxGridCount = useMemo(() => {
    if (allowedTrustIds.length > 0) {
      return allowedTrustIds.length;
    }

    return DEFAULT_GRID_COUNT;
  }, [allowedTrustIds]);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    localStorage.removeItem("refreshTime");
    localStorage.removeItem("gridCount");
    localStorage.removeItem("queueWarningLimit");
    localStorage.removeItem("serviceDelayLimit");
  }, []);

  /* ===================== HELPERS ===================== */
  function sortTrustDataById(dataList) {
    return [...dataList].sort((a, b) => {
      const trustA = getTrustMeta(a).trustId ?? Number.MAX_SAFE_INTEGER;
      const trustB = getTrustMeta(b).trustId ?? Number.MAX_SAFE_INTEGER;
      return trustA - trustB;
    });
  }

  async function fetchTrustMetrics(trustId) {
    try {
      const res = await fetch(
        `http://18.168.87.76:8084/getMetricDetails/?trustId=${trustId}`
        // `http://18.170.60.107:8085/getMetricDetails/?trustId=${trustId}`

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
        const trustId = getTrustMeta(data).trustId;
        if (trustId == null) return prev;

        const exists = prev.some(
          (item) => getTrustMeta(item).trustId === trustId
        );

        if (exists && append) return prev;

        let updated;

        if (append) {
          updated = [...prev, data];
        } else {
          updated = [
            ...prev.filter(
              (item) => getTrustMeta(item).trustId !== trustId
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

    const ids = allowedTrustIds.slice(0, Math.max(1, Number(gridCount) || 1));
    setTrustIds(ids);
    setAllTrustData([]);

    fetchTrustsProgressively(ids);
  }, [isLoggedIn, allowedTrustIds, gridCount]);

  /* ===================== GRID CHANGE ===================== */
  useEffect(() => {
    if (!isLoggedIn) return;

    const nextGridCount = Math.min(
      Math.max(1, Number(gridCount) || DEFAULT_GRID_COUNT),
      maxGridCount
    );

    if (nextGridCount !== Number(gridCount)) {
      setGridCount(nextGridCount);
    }
  }, [gridCount, isLoggedIn, maxGridCount]);

  useEffect(() => {
    if (!isLoggedIn) return;

    setTrustIds((prevIds) => {
      if (prevIds.length === 0) {
        return prevIds;
      }

      const safeGridCount = Math.min(
        Math.max(1, Number(gridCount) || 1),
        allowedTrustIds.length
      );

      if (safeGridCount <= prevIds.length) {
        const updatedIds = allowedTrustIds.slice(0, safeGridCount);

        setAllTrustData((prev) =>
          sortTrustDataById(prev).filter((item) =>
            updatedIds.includes(getTrustMeta(item).trustId)
          )
        );

        return updatedIds;
      }

      const newIds = allowedTrustIds
        .filter((id) => !prevIds.includes(id))
        .slice(0, safeGridCount - prevIds.length);

      if (newIds.length === 0) {
        return prevIds;
      }

      fetchTrustsProgressively(newIds, true);

      return [...prevIds, ...newIds];
    });
  }, [gridCount, isLoggedIn, allowedTrustIds]);

  useEffect(() => {
    if (!isLoggedIn) return;

    setSelectedTrustIds((prev) => {
      if (prev.includes("ALL")) {
        return ["ALL"];
      }

      const filteredIds = prev.filter((id) =>
        allowedTrustIds.includes(Number(id))
      );

      return filteredIds.length > 0 ? filteredIds : ["ALL"];
    });
  }, [isLoggedIn, allowedTrustIds]);

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
  const handleLogin = (userData, password = "") => {
    const uname = userData?.username || userData?.email || "";

    setIsLoggedIn(true);
    setUsername(uname);
    setLoggedInUser(userData || null);
    setSessionPassword(password);
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("username", uname);
    localStorage.setItem("loggedInUser", JSON.stringify(userData || null));
    sessionStorage.setItem("sessionPassword", password);
    navigate("/action");
  };

  const handleLogout = () => {
    localStorage.clear();
    setIsLoggedIn(false);
    setUsername("");
    setLoggedInUser(null);
    setSessionPassword("");
    setRefreshTime(DEFAULT_REFRESH_TIME);
    setGridCount(DEFAULT_GRID_COUNT);
    setQueueWarningLimit(DEFAULT_QUEUE_WARNING_LIMIT);
    setServiceDelayLimit(DEFAULT_SERVICE_DELAY_LIMIT);
    setSelectedTrustIds(["ALL"]);
    setAllTrustData([]);
    setTrustIds([]);
    sessionStorage.removeItem("sessionPassword");
    navigate("/login");
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
          maxGridCount={maxGridCount}
          isAdminUser={isAdminUser}
          username={username}
          userProfile={loggedInUser}
          queueWarningLimit={queueWarningLimit}
          onQueueWarningLimitChange={setQueueWarningLimit}
          serviceDelayLimit={serviceDelayLimit}
          onServiceDelayLimitChange={setServiceDelayLimit}
          selectedTrustIds={selectedTrustIds}
          onTrustChange={setSelectedTrustIds}
          trustData={allTrustData}
          onRefresh={() => fetchTrustsProgressively(trustIds)}
          onLogout={handleLogout}
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
          <Route
            path="support-actions"
            element={
              <SupportActions
                isAdminUser={isAdminUser}
                userProfile={loggedInUser}
              />
            }
          />
          <Route path="send-email" element={<SendMail />} />
          <Route path="faqs" element={<FAQ />} />
          <Route
            path="profile"
            element={
              <Profile
                username={username}
                userProfile={loggedInUser}
              />
            }
          />
        </Route>

        <Route
          element={isLoggedIn ? <ProfileLayout /> : <Navigate to="/login" />}
        >
          <Route
            path="/profile"
            element={
              <Profile
                username={username}
                userProfile={loggedInUser}
              />
            }
          />
        </Route>

        <Route
          path="/admin"
          element={
            isLoggedIn ? (
              isAdminUser ? <AdminLayout /> : <Navigate to="/action" replace />
            ) : (
              <Navigate to="/login" />
            )
          }
        >
          <Route index element={<Navigate to="profile" replace />} />
          <Route
            path="profile"
            element={
              <Profile
                username={username}
                userProfile={loggedInUser}
              />
            }
          />
          <Route path="add-trusts" element={<AddTrust />} />
          <Route
            path="support-actions"
            element={
              <SupportActions
                isAdminUser={isAdminUser}
                userProfile={loggedInUser}
              />
            }
          />
          <Route path="send-email" element={<SendMail />} />
          <Route path="faqs" element={<FAQ />} />
          <Route path="add-users" element={<AddUser />} />
          <Route path="summary-interfaces" element={<SummaryInterfaces />} />
          <Route
            path="settings"
            element={
              <SettingsPage
                refreshTime={refreshTime}
                onRefreshTimeChange={setRefreshTime}
                gridCount={gridCount}
                onGridCountChange={setGridCount}
                maxGridCount={maxGridCount}
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
