import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { ref as dbRef, onValue } from "firebase/database";
import { auth } from "../firebase";

export default function Inbox() {
  const [messages, setMessages] = useState([]);
  const user = auth.currentUser;

  useEffect(() => {
    const chatRef = dbRef(db, "messages");
    const unsubscribe = onValue(chatRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const msgs = Object.entries(data).map(([id, msg]) => ({ id, ...msg }));
        setMessages(msgs.reverse());
      } else {
        setMessages([]);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div style={inboxWrapper}>
      <h2 style={header}>📥 Inbox</h2>

      {messages.map((msg) => (
        <div key={msg.id} style={card}>
          <div style={topRow}>
            {msg.avatar && (
              <img src={msg.avatar} alt="avatar" style={avatar} />
            )}
            <div>
              <strong>{msg.name}</strong>
              <div style={time}>{msg.time}</div>
            </div>
          </div>

          {msg.replyTo && (
            <div style={replyBox}>↪ {msg.replyTo}</div>
          )}

          {msg.type === "image" ? (
            <img
              src={msg.imageUrl}
              alt="img"
              style={{ width: "100%", maxHeight: 200, marginTop: 10, borderRadius: 8 }}
              onClick={() => window.open(msg.imageUrl, "_blank")}
            />
          ) : (
            <div style={{ marginTop: 10 }}>{msg.text}</div>
          )}
        </div>
      ))}
    </div>
  );
}

const inboxWrapper = {
  padding: "16px",
  backgroundColor: "#121212",
  color: "#fff",
  minHeight: "100vh",
  fontFamily: "Poppins, sans-serif"
};

const header = {
  marginBottom: "16px",
  fontSize: "24px",
  fontWeight: "bold",
  color: "#00ffcc"
};

const card = {
  backgroundColor: "#1e1e1e",
  padding: "12px",
  borderRadius: "10px",
  marginBottom: "12px",
  boxShadow: "0 0 6px rgba(0,0,0,0.2)"
};

const topRow = {
  display: "flex",
  gap: "10px",
  alignItems: "center"
};

const avatar = {
  width: 36,
  height: 36,
  borderRadius: "50%"
};

const time = {
  fontSize: "12px",
  color: "#888"
};

const replyBox = {
  fontSize: "13px",
  fontStyle: "italic",
  color: "#ccc",
  marginTop: 4,
  padding: "4px 8px",
  backgroundColor: "#2a2a2a",
  borderRadius: 6
};
