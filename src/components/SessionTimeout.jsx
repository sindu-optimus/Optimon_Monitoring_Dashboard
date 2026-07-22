import { useCallback, useEffect, useRef, useState } from "react";

const IDLE_TIMEOUT_MS = 10 * 60 * 1000;
const IDLE_LOGOUT_WARNING_SECONDS = 30;
const TOKEN_EXPIRY_WARNING_SECONDS = 10;

const SessionTimeout = ({
  isLoggedIn,
  accessTokenExpiresAt,
  onLogout,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [reason, setReason] = useState("idle");
  const hasStartedLogoutRef = useRef(false);

  const logout = useCallback(() => {
    if (hasStartedLogoutRef.current) {
      return;
    }

    hasStartedLogoutRef.current = true;
    setIsModalOpen(false);
    onLogout();
  }, [onLogout]);

  const showTimeoutWarning = (timeoutReason, seconds) => {
    setReason(timeoutReason);
    setCountdown(seconds);
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (!isLoggedIn) {
      hasStartedLogoutRef.current = false;
      return;
    }

    if (isModalOpen) return;

    let idleTimer;
    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(
        () => showTimeoutWarning("idle", IDLE_LOGOUT_WARNING_SECONDS),
        IDLE_TIMEOUT_MS
      );
    };
    const activityEvents = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
    ];

    activityEvents.forEach((eventName) =>
      window.addEventListener(eventName, resetIdleTimer, { passive: true })
    );
    resetIdleTimer();

    return () => {
      clearTimeout(idleTimer);
      activityEvents.forEach((eventName) =>
        window.removeEventListener(eventName, resetIdleTimer)
      );
    };
  }, [isLoggedIn, isModalOpen]);

  useEffect(() => {
    if (!isLoggedIn || !accessTokenExpiresAt) return;

    const expiresInMs = accessTokenExpiresAt - Date.now();

    // An expired token from a previous browser session must never show a
    // warning modal. Clear the stale session and take the user to login.
    if (expiresInMs <= 0) {
      logout();
      return;
    }

    const warningDelay = Math.max(
      expiresInMs - TOKEN_EXPIRY_WARNING_SECONDS * 1000,
      0
    );
    const timer = setTimeout(
      () => showTimeoutWarning("token", TOKEN_EXPIRY_WARNING_SECONDS),
      warningDelay
    );

    return () => clearTimeout(timer);
  }, [accessTokenExpiresAt, isLoggedIn, logout]);

  useEffect(() => {
    if (!isModalOpen) return;
    if (countdown <= 0) {
      logout();
      return;
    }

    const timer = setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, isModalOpen, logout]);

  const handleContinue = () => logout();

  if (!isModalOpen) return null;

  return (
    <div
      className="session-expiry-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-expiry-title"
    >
      <div className="session-expiry-modal">
        <h3 id="session-expiry-title">Session ending soon</h3>
        <p>
          {reason === "idle"
            ? "You have been inactive for 10 minutes."
            : "Your access token is about to expire."}{" "}
          You will be logged out in {countdown} sec.
        </p>
        <div className="session-expiry-actions">
          <button
            type="button"
            className="session-expiry-btn session-expiry-btn-secondary"
            onClick={logout}
          >
            Logout
          </button>
          <button
            type="button"
            className="session-expiry-btn session-expiry-btn-primary"
            onClick={handleContinue}
          >
            Continue to login
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionTimeout;
