import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Chat from "./pages/Chatroom";
import Market from "./pages/Marketplace";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import { getAuth, onAuthStateChanged } from "firebase/auth";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAuth(), (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div style={{ padding: 40 }}>🔒 Loading...</div>;

  return (
    <Router>
      <Routes>
        {!user ? (
          // 🔐 Show only login/signup page if not logged in
          <Route path="*" element={<Login />} />
        ) : (
          // ✅ Show full app only when logged in
          <>
            <Route path="/" element={<Home />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/market" element={<Market />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/" />} />
          </>
        )}
      </Routes>
    </Router>
  );
}
