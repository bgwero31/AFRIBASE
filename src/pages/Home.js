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
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }, []);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  const bgStyle = {
    backgroundImage: `url('/assets/IMG-20250620-WA0005.jpg'), ${
      darkMode
        ? "linear-gradient(145deg, #1f1f1f, #0f0f0f)"
        : "linear-gradient(145deg, #f0f0f0, #ffffff)"
    }`,
    backgroundSize: "cover, 100%",
    backgroundRepeat: "no-repeat, no-repeat",
    backgroundPosition: "center center",
  };

  const textColor = darkMode ? "#fff" : "#111";

  return (
    <div style={{ ...containerStyle, ...bgStyle, color: textColor }}>
      {/* Toggle Button */}
      <button onClick={toggleDarkMode} style={toggleBtnStyle}>
        {darkMode ? "🌑" : "☀️"}
      </button>

      {/* Header */}
      <header style={headerStyle}>
        <h1 style={titleStyle}>
          {["A", "F", "R", "I", "B", "A", "S", "E"].map((char, i) => (
            <span key={i} style={{ color: ["#e60000", "#ffcc00", "#00cc00", "#000"][i % 4] }}>
              {char}
            </span>
          ))}
        </h1>
        <p style={subTitleStyle}>🎶 Your All-in-One African SuperApp 🪘</p>
      </header>

      {/* Navigation Buttons */}
      <main style={mainStyle}>
        <Link to="/chat" style={button3D}>💬 Chat Room</Link>
        <Link to="/market" style={button3D}>🛍️ Marketplace</Link>
        <Link to="/profile" style={button3D}>👤 My Profile</Link>
      </main>

      {/* African Proverb */}
      <p style={quoteStyle}>
        “If you want to go fast, go alone. If you want to go far, go together.” – African Proverb
      </p>

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
  background: "linear-gradient(145deg, #ffb300, #ff5722)",
  boxShadow: "0 8px 18px rgba(255, 87, 34, 0.4)",
  color: "#fff",
  textDecoration: "none",
  transition: "transform 0.3s ease-in-out",
  animation: "fadeInUp 0.6s ease-in-out"
};

const quoteStyle = {
  fontStyle: "italic",
  marginTop: "40px",
  maxWidth: "400px",
  textAlign: "center",
  color: "#ccc",
  lineHeight: 1.6
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
