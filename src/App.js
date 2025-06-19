import React from "react";

function App() {
  return (
    <div style={{
      background: "#121212",
      color: "#fff",
      minHeight: "100vh",
      fontFamily: "Poppins, sans-serif",
      padding: "20px"
    }}>
      <h1>🔥 Welcome to Afribase</h1>
      <p>Connect • Chat • Hustle • Sell</p>

      <div style={{ marginTop: "40px" }}>
        <a href="/chat" style={btnStyle}>💬 Chat Room</a><br />
        <a href="/market" style={btnStyle}>🛍️ Marketplace</a><br />
        <a href="/profile" style={btnStyle}>👤 My Profile</a>
      </div>
    </div>
  );
}

const btnStyle = {
  backgroundColor: "#00ffcc",
  color: "#000",
  padding: "12px 20px",
  borderRadius: "8px",
  textDecoration: "none",
  fontSize: "18px",
  margin: "10px 0",
  display: "inline-block"
};

export default App;
