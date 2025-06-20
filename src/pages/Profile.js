import React from "react";

const Profile = () => {
  return (
    <div style={container}>
      <div style={card}>
        <div style={avatar}></div>

        <h2 style={name}>B.JAY 🇿🇼</h2>
        <p style={tagline}>Full Stack Builder | Afribase Creator</p>

        <div style={badge}>🌟 VIP MEMBER</div>

        <div style={stats}>
          <div>
            <strong>14</strong>
            <p>Posts</p>
          </div>
          <div>
            <strong>32</strong>
            <p>Likes</p>
          </div>
          <div>
            <strong>7</strong>
            <p>Comments</p>
          </div>
        </div>

        <button style={button}>Edit Profile</button>
      </div>
    </div>
  );
};

export default Profile;

// Styles
const container = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "100vh",
  background: "#f5f5f5",
  padding: "20px"
};

const card = {
  background: "#fff",
  borderRadius: "20px",
  padding: "30px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  textAlign: "center",
  maxWidth: "350px",
  width: "100%"
};

const avatar = {
  width: "100px",
  height: "100px",
  borderRadius: "50%",
  background: "linear-gradient(135deg, #00ffcc, #007766)",
  margin: "0 auto 20px",
  border: "3px solid #fff",
  boxShadow: "0 0 12px #00ffcc88"
};

const name = {
  fontSize: "24px",
  fontWeight: "700",
  margin: "10px 0 5px"
};

const tagline = {
  fontSize: "14px",
  color: "#777",
  marginBottom: "15px"
};

const badge = {
  background: "#ffc107",
  color: "#000",
  padding: "6px 14px",
  borderRadius: "30px",
  fontSize: "12px",
  fontWeight: "600",
  marginBottom: "20px",
  display: "inline-block"
};

const stats = {
  display: "flex",
  justifyContent: "space-around",
  marginBottom: "20px",
  fontSize: "14px",
  color: "#555"
};

const button = {
  background: "#00cc88",
  color: "#fff",
  padding: "10px 20px",
  border: "none",
  borderRadius: "10px",
  fontWeight: "600",
  cursor: "pointer",
  transition: "0.3s"
};
