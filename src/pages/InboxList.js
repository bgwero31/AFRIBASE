// ✅ Inbox.js — 1-on-1 private messaging
import React, { useEffect, useRef, useState } from "react";
import { db } from "../firebase";
import {
  ref as dbRef,
  push,
  onValue,
  set,
  remove,
  update,
  get,
} from "firebase/database";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useParams } from "react-router-dom";

export default function Inbox() {
  const { targetId } = useParams();
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState("");
  const [userImage, setUserImage] = useState(null);
  const [targetName, setTargetName] = useState("User");
  const [targetImage, setTargetImage] = useState(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const typingTimeout = useRef(null);
  const messagesEndRef = useRef(null);

  const chatId = userId && targetId ? [userId, targetId].sort().join("_") : null;

  // Auth and user data
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        get(dbRef(db, `users/${user.uid}`)).then((snap) => {
          if (snap.exists()) {
            const d = snap.val();
            setUserName(d.name || "User");
            setUserImage(d.image || null);
          }
        });
      }
    });
    return unsub;
  }, []);

  // Target user info
  useEffect(() => {
    if (targetId) {
      get(dbRef(db, `users/${targetId}`)).then((snap) => {
        if (snap.exists()) {
          const d = snap.val();
          setTargetName(d.name || "User");
          setTargetImage(d.image || null);
        }
      });
    }
  }, [targetId]);

  // Load messages
  useEffect(() => {
    if (!chatId) return;
    const chatRef = dbRef(db, `privateChats/${chatId}/messages`);
    return onValue(chatRef, (snap) => {
      const data = snap.val();
      const msgs = data
        ? Object.entries(data).map(([id, m]) => ({ id, ...m }))
        : [];
      setMessages(msgs.sort((a, b) => a.timestamp - b.timestamp));
    });
  }, [chatId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark as seen
  useEffect(() => {
    if (!chatId || !userId) return;
    messages.forEach((msg) => {
      if (msg.uid !== userId && msg.status !== "seen") {
        update(dbRef(db, `privateChats/${chatId}/messages/${msg.id}`), {
          status: "seen",
        });
      }
    });
  }, [messages, chatId, userId]);

  // Typing logic
  const handleTyping = (e) => {
    setMessage(e.target.value);
    if (userId && chatId) {
      set(dbRef(db, `privateChats/${chatId}/typing/${userId}`), true);
      clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => {
        set(dbRef(db, `privateChats/${chatId}/typing/${userId}`), false);
      }, 2000);
    }
  };

  useEffect(() => {
    if (!chatId || !targetId) return;
    const ref = dbRef(db, `privateChats/${chatId}/typing/${targetId}`);
    return onValue(ref, (snap) => {
      setTyping(snap.val() === true);
    });
  }, [chatId, targetId]);

  // Send
  const sendMessage = () => {
    if (!message.trim() || !chatId || !userId) return;
    push(dbRef(db, `privateChats/${chatId}/messages`), {
      uid: userId,
      name: userName,
      image: userImage || null,
      type: "text",
      text: message.trim(),
      timestamp: Date.now(),
      status: "sent",
    });
    setMessage("");
    set(dbRef(db, `privateChats/${chatId}/typing/${userId}`), false);
  };

  const deleteMessage = (msgId) => {
    if (window.confirm("Delete this message?")) {
      remove(dbRef(db, `privateChats/${chatId}/messages/${msgId}`));
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
        {targetImage ? (
          <img src={targetImage} alt="profile" style={avatar} />
        ) : (
          <div style={avatar}>{targetName?.[0]}</div>
        )}
        <div style={{ marginLeft: 10 }}>
          <div style={{ fontWeight: "bold" }}>{targetName}</div>
          {typing && <div style={{ fontSize: 12 }}>typing...</div>}
        </div>
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
              <div style={{ fontSize: 14 }}>{msg.text}</div>
              {isOwn && (
                <button
                  onClick={() => deleteMessage(msg.id)}
                  title="Delete"
                  style={deleteBtn}
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
        <textarea
          rows={1}
          value={message}
          onChange={handleTyping}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
          placeholder="Type your message..."
          style={inputStyle}
        />
        <button
          onClick={sendMessage}
          disabled={!message.trim()}
          style={sendBtn}
        >
          ⬆️
        </button>
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
};

const chatHeader = {
  display: "flex",
  alignItems: "center",
  padding: 10,
  backgroundColor: "#00ffcc",
};

const avatar = {
  width: 40,
  height: 40,
  borderRadius: "50%",
  backgroundColor: "#ccc",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "bold",
};

const messagesContainer = {
  flex: 1,
  padding: 10,
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: 10,
  backgroundColor: "#f7f7f7",
};

const msgStyle = {
  padding: "10px 14px",
  borderRadius: 12,
  maxWidth: "70%",
  fontSize: "clamp(13px, 1.8vw, 15px)",
  position: "relative",
};

const timeStyle = {
  fontSize: "11px",
  marginTop: 4,
  textAlign: "right",
};

const deleteBtn = {
  position: "absolute",
  top: 4,
  right: 4,
  background: "transparent",
  border: "none",
  cursor: "pointer",
  color: "#f33",
  fontSize: 16,
};

const inputWrapper = {
  padding: 10,
  display: "flex",
  gap: 8,
  borderTop: "1px solid #ccc",
};

const inputStyle = {
  flex: 1,
  padding: 10,
  borderRadius: 6,
  border: "1px solid #ccc",
  resize: "none",
  fontSize: "clamp(14px, 1.8vw, 16px)",
};

const sendBtn = {
  fontSize: 22,
  background: "transparent",
  border: "none",
  color: "#00cc99",
  cursor: "pointer",
};
