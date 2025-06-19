import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import Chat from "./pages/Chat";
import Market from "./pages/Market";
import Profile from "./pages/Profile";

function App() {
  const [darkMode, setDarkMode] = useState(true);

  const toggleTheme = () => setDarkMode(!darkMode);

  const themeStyles = {
    background: darkMode ? "#121212" : "#f4f4f4",
    color: darkMode ? "#fff" : "#000",
    minHeight: "100vh",
    fontFamily: "Poppins, sans-serif",
    padding: "30px 20px",
    textAlign: "center",
    transition: "all 0.3s ease"
  };

  return (
    <Router>
      <div style={themeStyles}>
        <h1 style={{ fontSize: "32px", color: darkMode ? "#00ffcc" : "#006666" }}>
          🔥 Welcome to Afribase
        </h1>
        <p style={{ fontSize: "16px", color: darkMode ? "#ccc" : "#333" }}>
          Connect • Chat • Hustle • Sell
        </p>

        {/* Toggle Switch */}
        <button onClick={toggleTheme} style={toggleBtn}>
          {darkMode ? "🌞 Light Mode" : "🌙 Dark Mode"}
        </button>

        {/* Navigation */}
        <div style={navContainer}>
          <Link to="/" style={btnStyle}>🏠 Home</Link>
          <Link to="/chat" style={btnStyle}>💬 Chat Room</Link>
          <Link to="/market" style={btnStyle}>🛍️ Marketplace</Link>
          {/* Profile stays on Home */}
        </div>

        {/* Routes */}
        <div style={{ marginTop: "30px" }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/market" element={<Market />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

const toggleBtn = {
  marginTop: "10px",
  marginBottom: "20px",
  padding: "10px 18px",
  fontSize: "14px",
  borderRadius: "8px",
  border: "none",
  background: "#00ffcc",
  color: "#000",
  cursor: "pointer"
};

const navContainer = {
  marginTop: "30px",
  display: "flex",
  flexDirection: "column",
  gap: "15px",
  alignItems: "center"
};

const btnStyle = {
  backgroundColor: "#00ffcc",
  color: "#000",
  padding: "12px 24px",
  borderRadius: "10px",
  textDecoration: "none",
  fontSize: "18px",
  fontWeight: "600",
  width: "220px",
  textAlign: "center",
  boxShadow: "0 0 10px #00ffcc90",
};

export default App;
