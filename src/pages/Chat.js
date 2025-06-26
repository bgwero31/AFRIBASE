// ✅ Chat.js — With delete, read receipts, and open private inbox
import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import {
  ref as dbRef,
  push,
  onValue,
  set,
  get,
  remove,
  update,
} from "firebase/database";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { Link } from "react-router-dom";

export default function Chat() {
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState("User");
  const [userImage, setUserImage] = useState(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Get logged in user
  useEffect(() => {
    const auth = getAuth();
    return onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        get(dbRef(db, `users/${user.uid}`)).then((snap) => {
          const data = snap.val();
          if (data) {
            setUserName(data.name || "User");
            setUserImage(data.image || null);
          }
        });
      }
    });
  }, []);

  // Load messages
  useEffect(() => {
    const chatRef = dbRef(db, "messages");
    return onValue(chatRef, (snapshot) => {
      const data = snapshot.val();
      const msgs = data
        ? Object.entries(data).map(([id, msg]) => ({ id, ...msg }))
        : [];
      const sorted = msgs.sort((a, b) => a.timestamp - b.timestamp);
      setMessages(sorted);
    });
  }, []);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark other people’s messages as “seen”
  useEffect(() => {
    if (!userId) return;
    messages.forEach((msg) => {
      if (msg.uid !== userId && msg.status !== "seen") {
        update(dbRef(db, `messages/${msg.id}`), { status: "seen" });
      }
    });
  }, [messages, userId]);

  // Typing logic
  const handleTyping = (e) => {
    setMessage(e.target.value);
    updateTypingStatus(true);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => updateTypingStatus(false), 3000);
  };

  const updateTypingStatus = (isTyping) => {
    if (!userId) return;
    set(dbRef(db, `typingStatus/${userId}`), isTyping);
  };

  useEffect(() => {
    const typingRef = dbRef(db, "typingStatus");
    return onValue(typingRef, (snap) => {
      const data = snap.val();
      if (!data) return setTypingUsers([]);
      const active = Object.entries(data)
        .filter(([uid, status]) => status && uid !== userId)
        .map(([uid]) => uid);
      Promise.all(
        active.map((uid) =>
          get(dbRef(db, `users/${uid}`)).then((snap) =>
            snap.exists() ? snap.val().name : null
          )
        )
      ).then((names) => setTypingUsers(names.filter(Boolean)));
    });
  }, [userId]);

  // Send message
  const sendMessage = () => {
    if (!userId || !userName || !message.trim()) return;
    push(dbRef(db, "messages"), {
      uid: userId,
      name: userName,
      image: userImage || null,
      type: "text",
      text: message.trim(),
      timestamp: Date.now(),
      status: "sent",
    });
    setMessage("");
    updateTypingStatus(false);
  };

  // Delete
  const deleteMessage = async (msg) => {
    if (!window.confirm("Delete this message?")) return;
    try {
      await remove(dbRef(db, `messages/${msg.id}`));
    } catch (err) {
      console.error("Delete error", err);
    }
  };

  const messageStatus = (status) => {
    if (status === "sent") return "✅";
    if (status === "seen") return "✅✅";
    return "✅";
  };

  return (
    <div style={chatWrapper}>
      <div style={chatHeader}>
        <h2>💬 Afribase Public Chatroom</h2>
        {typingUsers.length > 0 && (
          <div style={{ fontSize: 14 }}>
            {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
          </div>
        )}
      </div>

      <div style={messagesContainer}>
        {messages.map((msg) => {
          const isOwn = msg.uid === userId;
          return (
            <div
              key={msg.id}
              style={{
                ...msgStyle,
                alignSelf: isOwn ? "flex-end" : "flex-start",
                backgroundColor: isOwn ? "#dcf8c6" : "#0055cc",
                color: isOwn ? "#000" : "#fff",
              }}
            >
              {/* Clickable profile */}
              <Link to={`/inbox/${msg.uid}`} style={{ textDecoration: "none", color: isOwn ? "#000" : "#fff" }}>
                <div style={{ fontWeight: "bold", fontSize: "13px", marginBottom: 4 }}>
                  {msg.image ? (
                    <img
                      src={msg.image}
                      alt="profile"
                      style={{ width: 24, height: 24, borderRadius: "50%", marginRight: 5 }}
                    />
                  ) : (
                    <span style={{ marginRight: 5 }}>{msg.name?.[0]}</span>
                  )}
                  {msg.name}
                </div>
              </Link>

              {msg.type === "text" && <div>{msg.text}</div>}

              {/* Delete button (🗑️) only for your own messages */}
              {isOwn && (
                <button
                  onClick={() => deleteMessage(msg)}
                  title="Delete message"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#f33",
                    fontSize: 18,
                    cursor: "pointer",
                    marginTop: 4,
                  }}
                >
                  🗑️
                </button>
              )}

              <div style={timeStyle}>
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                {messageStatus(msg.status)}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div style={inputWrapper}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
          <textarea
            rows={1}
            style={inputStyle}
            placeholder="Type a message..."
            value={message}
            onChange={handleTyping}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
          />
          <button
            onClick={sendMessage}
            disabled={!message.trim()}
            style={{
              fontSize: 24,
              background: "transparent",
              border: "none",
              color: "#00cc99",
              cursor: "pointer",
            }}
          >
            ⬆️
          </button>
        </div>
      </div>
    </div>
  );
}

// Styles
const chatWrapper = {
  display: "flex",
  flexDirection: "column",
  height: "100vh",
  fontFamily: "Poppins, sans-serif",
  background: "#f1f1f1",
};

const chatHeader = {
  padding: 10,
  background: "#00ffcc",
  color: "#000",
  textAlign: "center",
  fontSize: 16,
};

const messagesContainer = {
  flex: 1,
  padding: 10,
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const msgStyle = {
  padding: "10px 14px",
  borderRadius: "12px",
  maxWidth: "75%",
  fontSize: "clamp(13px, 1.8vw, 15px)",
  lineHeight: "1.4",
};

const timeStyle = {
  fontSize: "11px",
  marginTop: 4,
  textAlign: "right",
};

const inputWrapper = {
  padding: 10,
  borderTop: "1px solid #ccc",
  background: "#fff",
};

const inputStyle = {
  flex: 1,
  border: "none",
  borderRadius: 6,
  padding: 10,
  fontSize: "clamp(14px, 1.8vw, 16px)",
  resize: "none",
  maxHeight: 120,
  overflowY: "auto",
};
