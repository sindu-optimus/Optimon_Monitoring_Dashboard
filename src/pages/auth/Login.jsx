import React, { useState } from "react";
import LoginNavbar from "../../components/LoginNavbar";
import monitoringVector from "../../assets/monitoring_vector.png";
import bgVideo from "../../assets/servers-bg.mp4";
import "./Login.css";

const Login = ({ onLogin }) => {
  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  /* ---------- VALIDATION ---------- */
  const validate = (trigger) => {
    const err = {};

    // Password interaction without username
    if (trigger === "password" && !loginData.username.trim()) {
      err.username = "Username is required";
      err.password = "Password is required";
      return setErrors(err);
    }

    // Submit click
    if (trigger === "submit") {
      if (!loginData.username.trim()) {
        err.username = "Username is required";
      }
      if (!loginData.password) {
        err.password = "Password is required";
      } else if (loginData.password.length < 6) {
        err.password = "Minimum 6 characters required";
      }
    }

    setErrors(err);
  };

  /* ---------- FORM VALIDITY ---------- */
  const isFormValid =
    loginData.username.trim() &&
    loginData.password.length >= 6;

  /* ---------- SUBMIT ---------- */
  const handleSubmit = (e) => {
    e.preventDefault();

    validate("submit");
    if (!isFormValid) return;

    if (
      loginData.username === "admin" &&
      loginData.password === "password"
    ) {
      onLogin(loginData.username);
    } else {
      alert("Invalid credentials");
    }
  };

  return (
    <div className="login-page videoWrapper">
      <video className="bgVideo" autoPlay muted loop playsInline>
        <source src={bgVideo} type="video/mp4" />
      </video>

      <div className="videoOverlays" />

      <div className="login-card">
        <LoginNavbar />

        <div className="login-content">
          <div className="login-illustration">
            <img src={monitoringVector} alt="Monitoring Illustration" />
          </div>

          <div className="login-form">
            <h2>Welcome to</h2>
            <h1>OPTIMON+</h1>

            <form onSubmit={handleSubmit} noValidate>
              {/* USERNAME */}
              <input
                className={`login-input ${
                  errors.username ? "input-invalid" : ""
                }`}
                type="text"
                placeholder="Username"
                value={loginData.username}
                onChange={(e) => {
                  setLoginData({
                    ...loginData,
                    username: e.target.value,
                  });
                  if (errors.username) {
                    setErrors((prev) => ({
                      ...prev,
                      username: null,
                    }));
                  }
                }}
              />
              {errors.username && (
                <p className="input-error">{errors.username}</p>
              )}

              {/* PASSWORD */}
              <div className="login-password">
                <input
                  className={`login-input ${
                    errors.password ? "input-invalid" : ""
                  }`}
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={loginData.password}
                  onFocus={() => validate("password")}
                  onChange={(e) => {
                    setLoginData({
                      ...loginData,
                      password: e.target.value,
                    });
                    if (errors.password) {
                      setErrors((prev) => ({
                        ...prev,
                        password: null,
                      }));
                    }
                  }}
                />
                <i
                  className={`fa ${
                    showPassword ? "fa-eye-slash" : "fa-eye"
                  }`}
                  onClick={() => setShowPassword(!showPassword)}
                />
              </div>

              {errors.password && (
                <p className="input-error">{errors.password}</p>
              )}

              {/* FORGOT PASSWORD */}
              <div className="forgot-password">
                <span onClick={() => alert("Forgot password flow")}>
                  Forgot password?
                </span>
              </div>

              <button className="btn" disabled={!isFormValid}>
                Login
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
