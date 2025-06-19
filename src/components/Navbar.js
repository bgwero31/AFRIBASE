import React from "react";
import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav style={{ padding: "15px", background: "#1f1f1f", display: "flex", justifyContent: "center", gap: "30px" }}>
      <Link to="/" style={linkStyle}>🏠 Home</Link>
      <Link to="/chat" style={linkStyle}>💬 Chat</Link>
      <Link to="/market" style={linkStyle}>🛍️ Market</Link>
      <Link to="/profile" style={linkStyle}>👤 Profile</Link>
    </nav>
  );
};

const linkStyle = {
  color: "#00ffcc",
  textDecoration: "none",
  fontSize: "16px"
};

export default Navbar;
