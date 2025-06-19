import React from "react";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <h1 style={afribaseStyle}>AFRIBASE</h1>
        <p style={subTitleStyle}>Your All-in-One African SuperApp</p>
      </header>

      <main style={mainStyle}>
        <Link to="/chat" style={button3D}>💬 Chat Room</Link>
        <Link to="/market" style={button3D}>🛍️ Marketplace</Link>
        <Link to="/profile" style={button3D}>👤 My Profile</Link>
      </main>

      <footer style={footerStyle}>
        © Afribase – All rights reserved.
      </footer>
    </div>
  );
}

const containerStyle = {
  minHeight: "100vh",
  background: "linear-gradient(145deg, #1f1f1f, #0f0f0f)",
  color: "#fff",
  fontFamily: "'Poppins', sans-serif",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "20px"
};

const headerStyle = {
  textAlign: "center",
  marginBottom: "40px"
};

// 🔥 Gradient "fire flames" text
const afribaseStyle = {
  fontSize: "60px",
  fontWeight: "900",
  background: "linear-gradient(to top, #00ffcc, #000000)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  letterSpacing: "4px",
  textShadow: "0 0 20px #00ffcc55"
};

const subTitleStyle = {
  fontSize: "18px",
  color: "#bbb"
};

const mainStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "20px",
  alignItems: "center",
  width: "100%"
};

const button3D = {
  width: "260px",
  textAlign: "center",
  padding: "14px 24px",
  fontSize: "18px",
  fontWeight: "600",
  borderRadius: "12px",
  border: "none",
  background: "linear-gradient(145deg, #00ffcc, #00c2a6)",
  boxShadow: "0 8px 18px #00ffcc50",
  color: "#000",
  textDecoration: "none",
  transition: "all 0.3s ease-in-out"
};

const footerStyle = {
  marginTop: "auto",
  padding: "20px",
  fontSize: "14px",
  color: "#888",
  borderTop: "1px solid #333",
  width: "100%",
  textAlign: "center"
};
