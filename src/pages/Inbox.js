import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { ref as dbRef, onValue } from "firebase/database";

export default function Inbox() {
  const [messages, setMessages] = useState([]);
  const [onlyImages, setOnlyImages] = useState(false);
  const [searchUser, setSearchUser] = useState("");
  const [newMessageCount, setNewMessageCount] = useState(0);

  useEffect(() => {
    const chatRef = dbRef(db, "messages");

    let firstLoad = true;
    const unsubscribe = onValue(chatRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const msgs = Object.entries(data).map(([id, msg]) => ({ id, ...msg }));
        setMessages(msgs.reverse());

        if (!firstLoad) {
          setNewMessageCount((prev) => prev + 1);
        }
        firstLoad = false;
      } else {
        setMessages([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const filteredMessages = messages.filter((msg) => {
    const matchesImage = onlyImages ? msg.type === "image" : true;
    const matchesUser = msg.name?.toLowerCase().includes(searchUser.toLowerCase());
    return matchesImage && matchesUser;
  });

  return (
    <div style={inboxWrapper}>
      <div style={headerRow}>
        <h2 style={header}>📥 Inbox</h2>
        {newMessageCount > 0 && (
          <span style={badge}>{newMessageCount}</span>
        )}
      </div>

      <div style={filterBar}>
        <input
          type="text"
          placeholder="Search by user name..."
          value={searchUser}
          onChange={(e) => setSearchUser(e.target.value)}
          style={searchInput}
        />

        <label style={toggleLabel}>
          <input
            type="checkbox"
            checked={onlyImages}
            onChange={() => setOnlyImages(!onlyImages)}
          />
          Only Images
        </label>
      </div>

      {filteredMessages.map((msg) => (
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

// 🔧 STYLES
const inboxWrapper = {
  padding: "16px",
  backgroundColor: "#121212",
  color: "#fff",
  minHeight: "100vh",
  fontFamily: "Poppins, sans-serif"
};

const headerRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between"
};

const header = {
  fontSize: "24px",
  fontWeight: "bold",
  color: "#00ffcc"
};

const badge = {
  backgroundColor: "#0f0",
  color: "#000",
  fontWeight: "bold",
  borderRadius: "50%",
  padding: "6px 10px",
  fontSize: "12px"
};

const filterBar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  margin: "16px 0"
};

const searchInput = {
  padding: "8px",
  borderRadius: "6px",
  border: "none",
  fontSize: "14px",
  flex: 1,
  marginRight: "10px"
};

const toggleLabel = {
  fontSize: "14px",
  display: "flex",
  alignItems: "center",
  gap: "6px"
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
