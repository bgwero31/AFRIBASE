// src/pages/Login.js
import React, { useState } from "react";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { ref, set } from "firebase/database";
import { db } from "../firebase";

const auth = getAuth();

export default function Login() {
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    setLoading(true);
    try {
      if (isSignup) {
        const res = await createUserWithEmailAndPassword(auth, form.email, form.password);
        await set(ref(db, `users/${res.user.uid}`), {
          name: "New User",
          email: res.user.email,
          image: "",
          vip: false,
          posts: 0,
          likes: 0,
          comments: 0,
        });
      } else {
        await signInWithEmailAndPassword(auth, form.email, form.password);
      }
      navigate("/"); // Redirect to Home after login/signup
    } catch (err) {
      alert(err.message);
    }
    setLoading(false);
  };

  const bgImage = "/assets/IMG-20250620-WA0005.jpg";

  return (
    <div style={{ ...container, backgroundImage: `url(${bgImage})` }}>
      <div style={overlay} />
      <div style={card}>
        <h1 style={title}>AFRIBASE</h1>
        <p style={subtitle}>{isSignup ? "Create your account" : "Welcome back!"}</p>
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          style={input}
        />
        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          style={input}
        />
        <button onClick={handleAuth} disabled={loading} style={button}>
          {loading ? "Processing..." : isSignup ? "Sign Up" : "Log In"}
        </button>
        <p style={switcher}>
          {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
          <span onClick={() => setIsSignup(!isSignup)} style={link}>
            {isSignup ? "Log In" : "Sign Up"}
          </span>
        </p>
        <footer style={footer}>© 2025 Afribase. All rights reserved.</footer>
      </div>
    </div>
  );
}

// Styles
const container = {
  minHeight: "100vh",
  backgroundSize: "cover",
  backgroundPosition: "center",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  position: "relative",
  padding: "20px",
  fontFamily: "Poppins, sans-serif",
};

const overlay = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0, 0, 0, 0.6)",
  zIndex: 0,
};

const card = {
  position: "relative",
  zIndex: 1,
  background: "#fff",
  padding: "40px 30px",
  borderRadius: "20px",
  boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
  maxWidth: "350px",
  width: "100%",
  textAlign: "center",
};

const title = {
  fontSize: "34px",
  fontWeight: "800",
  background: "linear-gradient(to right, #00ffcc, #004040)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  marginBottom: "10px",
};

const subtitle = {
  fontSize: "16px",
  color: "#333",
  marginBottom: "20px",
};

const input = {
  width: "100%",
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid #ccc",
  marginBottom: "15px",
  fontSize: "15px",
};

const button = {
  width: "100%",
  padding: "12px",
  borderRadius: "10px",
  border: "none",
  background: "linear-gradient(145deg, #00cc88, #009966)",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold",
  cursor: "pointer",
  marginBottom: "10px",
};

const switcher = {
  fontSize: "14px",
  color: "#555",
};

const link = {
  color: "#00cc88",
  cursor: "pointer",
  fontWeight: "600",
};

const footer = {
  marginTop: "30px",
  fontSize: "12px",
  color: "#aaa",
};
