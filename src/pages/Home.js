import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export default function Home() {
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      @keyframes flameFlow {
        0% { background-position: 0% 100%; }
        100% { background-position: 0% 0%; }
      }
    `;
    document.head.appendChild(style);
  }, []);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  const bgStyle = darkMode
    ? "linear-gradient(145deg, #1f1f1f, #0f0f0f)"
    : "linear-gradient(145deg, #f0f0f0, #ffffff)";
  const textColor = darkMode ? "#fff" : "#111";

  return (
    <div style={{ ...containerStyle, background: bgStyle, color: textColor }}>
      {/* Toggle Button */}
      <button onClick={toggleDarkMode} style={toggleBtnStyle}>
        {darkMode ? "🌙" : "☀️"}
      </button>

      {/* Header */}
      <header style={headerStyle}>
        <h1 style={titleStyle}>AFRIBASE</h1>
        <p style={subTitleStyle}>Your All-in-One African SuperApp</p>
      </header>

      {/* Navigation Buttons */}
      <main style={mainStyle}>
        <Link to="/chat" style={button3D}>💬 Chat Room</Link>
        <Link to="/market" style={button3D}>🛍️ Marketplace</Link>
        <Link to="/profile" style={button3D}>👤 My Profile</Link>
      </main>

      {/* Footer */}
      <footer style={footerStyle}>
        © Afribase – All rights reserved.
      </footer>
    </div>
  );
}

// Styles
const containerStyle = {
  minHeight: "100vh",
  fontFamily: "'Poppins', sans-serif",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "20px",
  position: "relative"
};

const toggleBtnStyle = {
  position: "absolute",
  top: "20px",
  left: "20px",
  fontSize: "24px",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  color: "#00ffcc"
};

const headerStyle = {
  textAlign: "center",
  marginTop: "60px",
  marginBottom: "40px"
};

const titleStyle = {
  fontSize: "42px",
  fontWeight: "900",
  background: "linear-gradient(to top, #00ffcc, #000000)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  textShadow: "0 0 20px #00ffcc55",
  animation: "flameFlow 3s infinite alternate ease-in-out",
  backgroundSize: "100% 200%"
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
