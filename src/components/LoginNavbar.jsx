import React, { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import optimon_logo from "../assets/optimon_logo.png";
import "./LoginNavbar.css";

const LoginNavbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="login-navbar">
      {/* LEFT */}
      <img
        src={optimon_logo}
        alt="Optimon Logo"
        className="login-logo"
      />

      {/* HAMBURGER (MOBILE ONLY) */}
      <div
        className="menu-icon"
        onClick={() => setIsMenuOpen((prev) => !prev)}
      >
        <i
          className={`fa-solid ${
            isMenuOpen ? "ri-menu-line" : "ri-menu-line"
          }`}
        />
      </div>

      {/* DESKTOP MENU */}
      <div className="login-nav-right desktop-only">
        <NavLink
          to="/about"
          className={({ isActive }) =>
            isActive ? "nav-link active" : "nav-link"
          }
        >
          About Us
        </NavLink>

        <NavLink
          to="/contact"
          className={({ isActive }) =>
            isActive ? "nav-link active" : "nav-link"
          }
        >
          Contact Us
        </NavLink>

        <Link to="/login" className="login-nav-btn">
          Login
        </Link>
      </div>

      {/* MOBILE MENU */}
      {isMenuOpen && (
        <div className="mobile-menu">
          <NavLink
            to="/about"
            className="mobile-link"
            onClick={() => setIsMenuOpen(false)}
          >
            About Us
          </NavLink>

          <NavLink
            to="/contact"
            className="mobile-link"
            onClick={() => setIsMenuOpen(false)}
          >
            Contact Us
          </NavLink>

          <Link
            to="/login"
            className="mobile-login-btn"
            onClick={() => setIsMenuOpen(false)}
          >
            Login
          </Link>
        </div>
      )}
    </nav>
  );
};

export default LoginNavbar;
