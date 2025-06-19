import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import Chat from "./pages/Chat";
import Market from "./pages/Market";
import Profile from "./pages/Profile";

function App() {
  return (
    <Router>
      <div style={containerStyle}>
        <h1 style={headingStyle}>🔥 Welcome to Afribase</h1>
        <p style={{ fontSize: "16px", color: "#ccc" }}>
          Connect • Chat • Hustle • Sell
        </p>

        <div style={navContainer}>
          <Link to="/" style={btnStyle}>🏠 Home</Link>
          <Link to="/chat" style={btnStyle}>💬 Chat Room</Link>
          <Link to="/market" style={btnStyle}>🛍️ Marketplace</Link>
          <Link to="/profile" style={btnStyle}>👤 My Profile</Link>
        </div>

        <div style={{ marginTop: "40px" }}>
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

const containerStyle = {
  background: "#121212",
  color: "#fff",
  minHeight: "100vh",
  fontFamily: "Poppins, sans-serif",
  padding: "40px 20px",
  textAlign: "center"
};

const headingStyle = {
  fontSize: "32px",
  color: "#00ffcc",
  marginBottom: "10px"
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
