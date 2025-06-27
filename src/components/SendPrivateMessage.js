// Updated SendPrivateMessage.js to save messages bi-directionally (sender + receiver),
// and include sender name in the inbox chat as requested.

import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref as dbRef, push, set, get } from "firebase/database";
import { getAuth } from "firebase/auth";

export default function SendPrivateMessage({ recipientUID, recipientName, onClose, productId = null }) {
  const [message, setMessage] = useState("");
  const auth = getAuth();
  const sender = auth.currentUser;
  const [senderName, setSenderName] = useState(sender?.displayName || "Anonymous");

  useEffect(() => {
    // Fetch sender name from db if needed (optional)
    if (sender) {
      get(dbRef(db, `users/${sender.uid}/name`)).then((snap) => {
        if (snap.exists()) setSenderName(snap.val());
      });
    }
  }, [sender]);

  const handleSend = async () => {
    if (!message.trim()) return alert("Message cannot be empty");
    if (!sender) return alert("You must be logged in to send messages");

    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const msgData = {
      fromUID: sender.uid,
      fromName: senderName,
      fromAvatar: sender.photoURL || "",
      text: message.trim(),
      time,
      productId,
    };

    try {
      // Push message to recipient inbox
      const recipientRef = dbRef(db, `inbox/${recipientUID}/${sender.uid}`);
      await push(recipientRef, msgData);

      // Also push message to sender's inbox for the recipient chat
      const senderRef = dbRef(db, `inbox/${sender.uid}/${recipientUID}`);
      await push(senderRef, msgData);

      alert("Message sent!");
      setMessage("");
      onClose();
    } catch (err) {
      console.error("Error sending private message:", err);
      alert("Failed to send message");
    }
  };

  return (
    <div style={overlay}>
      <div style={modal}>
        <h3>
          Send Message to <span style={{ color: "#00ffcc" }}>{recipientName}</span>
        </h3>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder="Type your message..."
          style={textarea}
        />
        <div style={{ marginTop: 12, display: "flex", gap: "10px" }}>
          <button onClick={handleSend} style={btn}>
            Send
          </button>
          <button onClick={onClose} style={cancelBtn}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// 🔧 STYLES
const overlay = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  backgroundColor: "rgba(0,0,0,0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const modal = {
  background: "#1e1e1e",
  padding: "24px",
  borderRadius: "10px",
  width: "90%",
  maxWidth: "400px",
  color: "#fff",
  fontFamily: "Poppins, sans-serif",
};

const textarea = {
  width: "100%",
  padding: "12px",
  fontSize: "15px",
  borderRadius: "6px",
  border: "none",
  resize: "none",
  backgroundColor: "#2b2b2b",
  color: "#fff",
};

const btn = {
  padding: "10px 16px",
  backgroundColor: "#00ffcc",
  color: "#000",
  fontWeight: "bold",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
};

const cancelBtn = {
  ...btn,
  backgroundColor: "#444",
  color: "#fff",
};
