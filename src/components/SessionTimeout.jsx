import { useCallback, useEffect, useRef, useState } from "react";

const IDLE_TIMEOUT_MS = 3 * 60 * 60 * 1000;
const IDLE_LOGOUT_WARNING_SECONDS = 30;
const TOKEN_EXPIRY_WARNING_SECONDS = 10;

const SessionTimeout = ({
  isLoggedIn,
  accessTokenExpiresAt,
  onLogout,
  onRefreshToken,
}) => {
  const [isIdleWarningOpen, setIsIdleWarningOpen] = useState(false);
  const [isTokenWarningOpen, setIsTokenWarningOpen] = useState(false);
  const [idleCountdown, setIdleCountdown] = useState(0);
  const [tokenCountdown, setTokenCountdown] = useState(0);
  const [isRefreshingToken, setIsRefreshingToken] = useState(false);
  const hasStartedLogoutRef = useRef(false);

  const logout = useCallback(() => {
    if (hasStartedLogoutRef.current) {
      return;
    }

    hasStartedLogoutRef.current = true;
    setIsIdleWarningOpen(false);
    setIsTokenWarningOpen(false);
    onLogout();
  }, [onLogout]);

  const showIdleWarning = useCallback(() => {
    setIdleCountdown(IDLE_LOGOUT_WARNING_SECONDS);
    setIsIdleWarningOpen(true);
  }, []);

  const showTokenWarning = useCallback(() => {
    setTokenCountdown(TOKEN_EXPIRY_WARNING_SECONDS);
    setIsTokenWarningOpen(true);
  }, []);

  const handleIdleContinue = useCallback(() => {
    setIsIdleWarningOpen(false);
    setIdleCountdown(0);
  }, []);

  const handleTokenContinue = async () => {
    if (!onRefreshToken || isRefreshingToken) return;

    try {
      setIsRefreshingToken(true);
      await onRefreshToken();
      setIsTokenWarningOpen(false);
      setTokenCountdown(0);
    } catch {
      // A failed refresh means this token cannot safely be extended.
      logout();
    } finally {
      setIsRefreshingToken(false);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) {
      hasStartedLogoutRef.current = false;
      return;
    }

    if (isIdleWarningOpen) return;

    let idleTimer;
    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(
        showIdleWarning,
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
  }, [isLoggedIn, isIdleWarningOpen, showIdleWarning]);

  useEffect(() => {
    if (!isLoggedIn || !accessTokenExpiresAt) return;
    if (isTokenWarningOpen) return;

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
      showTokenWarning,
      warningDelay
    );

    return () => clearTimeout(timer);
  }, [
    accessTokenExpiresAt,
    isLoggedIn,
    isTokenWarningOpen,
    logout,
    showTokenWarning,
  ]);

  useEffect(() => {
    if (!isIdleWarningOpen) return;
    if (idleCountdown <= 0) {
      logout();
      return;
    }

    const timer = setTimeout(
      () => setIdleCountdown((value) => value - 1),
      1000
    );
    return () => clearTimeout(timer);
  }, [idleCountdown, isIdleWarningOpen, logout]);

  useEffect(() => {
    if (!isTokenWarningOpen) return;
    if (tokenCountdown <= 0) {
      logout();
      return;
    }

    const timer = setTimeout(
      () => setTokenCountdown((value) => value - 1),
      1000
    );
    return () => clearTimeout(timer);
  }, [tokenCountdown, isTokenWarningOpen, logout]);

  if (!isIdleWarningOpen && !isTokenWarningOpen) return null;

  return (
    <>
      {isIdleWarningOpen && (
        <div className="session-expiry-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="idle-session-expiry-title">
          <div className="session-expiry-modal">
            <h3 id="idle-session-expiry-title">Session ending soon</h3>
            <p>You have been inactive for 10 minutes. You will be logged out in {idleCountdown} seconds.</p>
            <div className="session-expiry-actions">
              <button type="button" className="session-expiry-btn session-expiry-btn-secondary" onClick={logout}>Logout</button>
              <button type="button" className="session-expiry-btn session-expiry-btn-primary" onClick={handleIdleContinue}>Continue</button>
            </div>
          </div>
        </div>
      )}
      {isTokenWarningOpen && (
        <div className="session-expiry-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="token-session-expiry-title">
          <div className="session-expiry-modal">
            <h3 id="token-session-expiry-title">Session ending soon</h3>
            <p>Your session is about to expire. You will be logged out in {tokenCountdown} seconds.</p>
            <div className="session-expiry-actions">
              <button type="button" className="session-expiry-btn session-expiry-btn-secondary" onClick={logout} disabled={isRefreshingToken}>Logout</button>
              <button type="button" className="session-expiry-btn session-expiry-btn-primary" onClick={handleTokenContinue} disabled={isRefreshingToken}>{isRefreshingToken ? "Continuing..." : "Continue"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SessionTimeout;
