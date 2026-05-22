import React, { useState } from "react";
import LoginNavbar from "../../components/LoginNavbar";
import monitoringVector from "../../assets/monitoring_vector.png";
import bgVideo from "../../assets/servers-bg.mp4";
import { forgotPassword, loginUser } from "../../api/loginService";
import "./Login.css";

const Login = ({ onLogin }) => {
  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
  });
  const [forgotData, setForgotData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [apiError, setApiError] = useState("");
  const [apiMessage, setApiMessage] = useState("");
  const [loading, setLoading] = useState(false);

  /* ---------- VALIDATION ---------- */
  const validate = (trigger) => {
    const err = {};
    const formData = isForgotPassword ? forgotData : loginData;

    if (trigger === "password" && !formData.username.trim()) {
      err.username = "Username is required";
      err.password = "Password is required";
      return setErrors(err);
    }

    if (trigger === "submit") {
      if (!formData.username.trim()) {
        err.username = "Username is required";
      }
      if (!formData.password) {
        err.password = "Password is required";
      } else if (formData.password.length < 6) {
        err.password = "Minimum 6 characters required";
      }

      if (isForgotPassword) {
        if (!forgotData.confirmPassword) {
          err.confirmPassword = "Confirm password is required";
        } else if (forgotData.confirmPassword !== forgotData.password) {
          err.confirmPassword = "Passwords do not match";
        }
      }
    }

    setErrors(err);
    return err;
  };

  /* ---------- FORM VALID ---------- */
  const isLoginFormValid =
    loginData.username.trim() && loginData.password.length >= 6;
  const isForgotFormValid =
    forgotData.username.trim() &&
    forgotData.password.length >= 6 &&
    forgotData.confirmPassword === forgotData.password;
  const isFormValid = isForgotPassword
    ? isForgotFormValid
    : isLoginFormValid;

  const updateField = (field, value) => {
    if (isForgotPassword) {
      setForgotData((prev) => ({
        ...prev,
        [field]: value,
      }));
    } else {
      setLoginData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }

    if (apiError) {
      setApiError("");
    }
    if (apiMessage) {
      setApiMessage("");
    }
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: null,
      }));
    }
  };

  const toggleForgotPassword = () => {
    setIsForgotPassword((prev) => !prev);
    setErrors({});
    setApiError("");
    setApiMessage("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  /* ---------- SUBMIT ---------- */
  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validate("submit");
    if (Object.keys(validationErrors).length || !isFormValid) return;

    try {
      setLoading(true);
      setApiError(""); // clear old error
      setApiMessage("");

      if (isForgotPassword) {
        await forgotPassword({
          username: forgotData.username,
          password: forgotData.password,
        });

        setApiMessage("Password updated successfully");
        setForgotData({
          username: "",
          password: "",
          confirmPassword: "",
        });
        return;
      }

      const res = await loginUser({
        username: loginData.username,
        password: loginData.password,
      });

      console.group("[Login] Success");
      console.log("Submitted login details:", {
        username: loginData.username,
        password: loginData.password ? "********" : "",
      });
      console.log("Logged-in user data:", res.data);
      console.groupEnd();

      onLogin(res.data, loginData.password);

    } catch (error) {
      console.error("Login Error:", error);
      setApiError(
        error.response?.data?.message ||
          (isForgotPassword
            ? "Unable to update password"
            : "Invalid credentials")
      );
    } finally {
      setLoading(false);
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
                value={
                  isForgotPassword
                    ? forgotData.username
                    : loginData.username
                }
                onChange={(e) => updateField("username", e.target.value)}
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
                  placeholder={
                    isForgotPassword ? "New Password" : "Password"
                  }
                  value={
                    isForgotPassword
                      ? forgotData.password
                      : loginData.password
                  }
                  onFocus={() => validate("password")}
                  onChange={(e) => updateField("password", e.target.value)}
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

              {isForgotPassword && (
                <>
                  <div className="login-password">
                    <input
                      className={`login-input ${
                        errors.confirmPassword ? "input-invalid" : ""
                      }`}
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm Password"
                      value={forgotData.confirmPassword}
                      onChange={(e) =>
                        updateField("confirmPassword", e.target.value)
                      }
                    />
                    <i
                      className={`fa ${
                        showConfirmPassword ? "fa-eye-slash" : "fa-eye"
                      }`}
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                    />
                  </div>

                  {errors.confirmPassword && (
                    <p className="input-error">
                      {errors.confirmPassword}
                    </p>
                  )}
                </>
              )}

              {/* FORGOT PASSWORD */}
              <div className="forgot-password">
                <button type="button" onClick={toggleForgotPassword}>
                  {isForgotPassword ? "Back to login" : "Forgot password?"}
                </button>
              </div>

              {apiError && <div className="input-error">{apiError}</div>}
              {apiMessage && (
                <div className="form-msg form-success">{apiMessage}</div>
              )}

              {/* BUTTON */}
              <button
                className="btn"
                disabled={!isFormValid || loading}
              >
                {loading
                  ? isForgotPassword
                    ? "Updating..."
                    : "Logging in..."
                  : isForgotPassword
                    ? "Update Password"
                    : "Login"}
              </button>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
