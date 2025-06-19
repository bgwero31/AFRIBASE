import React from "react";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div style={containerStyle}>
      <h1 style={headingStyle}>🔥 Welcome to Afribase</h1>
      <p style={{ fontSize: "16px", color: "#ccc" }}>
        Connect • Chat • Hustle • Sell
      </p>

      <div style={navContainer}>
        <Link to="/chat" style={btnStyle}>💬 Chat Room</Link>
        <Link to="/market" style={btnStyle}>🛍️ Marketplace</Link>
      </div>

      <div style={profileBox}>
        <h3>👤 My Profile</h3>
        <p>Name: B.JAY</p>
        <p>Status: Visionary 🇿🇼</p>
      </div>
    </div>
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

const profileBox = {
  marginTop: "40px",
  padding: "20px",
  backgroundColor: "#222",
  borderRadius: "12px"
};
