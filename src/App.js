import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Chat from "./pages/Chat";
import Market from "./pages/Market";
import Profile from "./pages/Profile"; // ✅ Add this

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/market" element={<Market />} />
        <Route path="/profile" element={<Profile />} /> {/* ✅ Add this */}
      </Routes>
    </Router>
  );
}

export default App;
