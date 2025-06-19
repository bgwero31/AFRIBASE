import React from "react";

export default function Home() {
  return (
    <div style={homeContainer}>
      <h2 style={{ color: "#00ffcc" }}>👤 My Profile</h2>
      <div style={profileBox}>
        <p><strong>Name:</strong> B.JAY</p>
        <p><strong>Status:</strong> Online</p>
        <p><strong>Location:</strong> Zimbabwe</p>
        <p><strong>Joined:</strong> June 2025</p>
      </div>
    </div>
  );
}

const homeContainer = {
  marginTop: "40px",
  padding: "20px",
  background: "#1e1e1e",
  borderRadius: "12px",
  boxShadow: "0 0 8px #00ffcc88",
  maxWidth: "500px",
  margin: "auto",
};

const profileBox = {
  textAlign: "left",
  fontSize: "16px",
  lineHeight: "1.6",
  color: "#fff",
};
