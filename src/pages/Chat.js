import React, { useState, useEffect, useRef } from "react";
import { db, storage } from "../firebase";
import {
  ref as dbRef,
  push,
  onValue,
  remove,
  set,
  get,
  update,
} from "firebase/database";
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { getAuth, onAuthStateChanged } from "firebase/auth";

// Notification sound
const newMsgSound = new Audio("/assets/notification.mp3");

export default function Chat() {
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState("User");
  const [userImage, setUserImage] = useState(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [unread, setUnread] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [recording, setRecording] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const auth = getAuth();

  // Connect user, set online/typing status
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        get(dbRef(db, `users/${user.uid}`)).then((snap) => {
          if (snap.exists()) {
            const data = snap.val();
            setUserName(data.name);
            setUserImage(data.image || null);
          }
        });
        set(dbRef(db, `onlineUsers/${user.uid}`), true);
      }
    });

    return () => {
      if (auth.currentUser?.uid) {
        set(dbRef(db, `onlineUsers/${auth.currentUser.uid}`), null);
        set(dbRef(db, `typingStatus/${auth.currentUser.uid}`), null);
      }
      unsubAuth();
    };
  }, []);

  // Track focus to know if chatroom is open
  useEffect(() => {
    setIsActive(true);
    window.addEventListener("focus", () => setIsActive(true));
    window.addEventListener("blur", () => setIsActive(false));
    return () => {
      window.removeEventListener("focus", () => setIsActive(true));
      window.removeEventListener("blur", () => setIsActive(false));
    };
  }, []);

  // Load messages
  useEffect(() => {
    const chatRef = dbRef(db, "messages");
    return onValue(chatRef, (snap) => {
      const data = snap.val() || {};
      const msgs = Object.entries(data)
        .map(([id, m]) => ({ id, ...m }))
        .sort((a, b) => a.timestamp - b.timestamp);
      setMessages(msgs);
      if (!isActive) {
        setUnread((u) => u + 1);
      } else {
        setUnread(0);
      }
      // Play sound only when chatroom active and new msg is not ours
      if (isActive && msgs.length && msgs[msgs.length - 1].uid !== userId) {
        newMsgSound.play().catch(() => {});
      }
    });
  }, [userId, isActive]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Typing indicator
  useEffect(() => {
    const typeRef = dbRef(db, "typingStatus");
    return onValue(typeRef, (snap) => {
      const data = snap.val() || {};
      const names = Object.entries(data)
        .filter(([id, st]) => st && id !== userId)
        .map(([uid]) => uid)
        .map((uid) => null); // Placeholder replaced below
      Promise.all(
        Object.entries(data)
          .filter(([id, st]) => st && id !== userId)
          .map(([uid]) => get(dbRef(db, `users/${uid}`)).then((s) => s.val()?.name))
      ).then((n) => setTypingUsers(n.filter(Boolean)));
    });
  }, [userId]);

  // Online user list
  useEffect(() => {
    const onlineRef = dbRef(db, "onlineUsers");
    return onValue(onlineRef, (snap) => {
      const data = snap.val() || {};
      const uids = Object.entries(data).filter(([,on]) => on).map(([uid]) => uid);
      Promise.all(uids.map((uid) => get(dbRef(db, `users/${uid}`)).then((s) => s.val()?.name)))
        .then((names) => setOnlineUsers(names.filter(Boolean)));
    });
  }, []);

  // Input handlers
  const handleTyping = (e) => {
    setMessage(e.target.value);
    set(dbRef(db, `typingStatus/${userId}`), true);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      set(dbRef(db, `typingStatus/${userId}`), false);
    }, 2000);
  };

  const sendMessage = () => {
    if (!message.trim()) return;
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
    set(dbRef(db, `typingStatus/${userId}`), false);
  };

  // Image & Voice handlers (same as before) ...
  const handleImageUpload = (e) => { /* ... */ };
  const startRecording = async () => { /* ... */ };
  const stopRecording = () => { /* ... */ };
  const uploadVoiceNote = (blob) => { /* ... */ };

  const deleteMessage = async (msg) => { /* ... */ };
  const addEmoji = (e) => setMessage((m) => m + e);

  return (
    <div style={chatWrapper}>
      <div style={chatHeader}>
        <h2>💬 Welcome to Chatroom</h2>
        {typingUsers.length > 0 && (
          <div style={{ fontSize: 14 }}>
            {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing…
          </div>
        )}
        {onlineUsers.length > 0 && (
          <div style={{ fontSize: 12, color: "#555" }}>
            Online: {onlineUsers.join(", ")}
          </div>
        )}
        {unread > 0 && (
          <div style={{ fontSize: 12, color: "red" }}>
            🔔 {unread} unread message{unread > 1 ? "s" : ""}
          </div>
        )}
      </div>

      <div style={messagesContainer}>
        {messages.map((msg) => {
          const isOwn = msg.uid === userId;
          return (
            <div key={msg.id} style={{
              ...msgStyle,
              alignSelf: isOwn ? "flex-end" : "flex-start",
              backgroundColor: isOwn ? "#dcf8c6" : "#0055cc",
              color: isOwn ? "#000" : "#fff",
            }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                <img
                  src={msg.image}
                  alt="User"
                  style={{ width: 32, height: 32, borderRadius: "50%" }}
                />
                <span>{msg.name}</span>
              </div>
              {msg.type === "text" && <div>{msg.text}</div>}
              {msg.type === "image" && (
                <img
                  src={msg.imageUrl} alt="pic"
                  style={{ maxWidth: 200, borderRadius: 8 }}
                  onClick={() => window.open(msg.imageUrl)}
                />
              )}
              {msg.type === "voice" && <audio controls src={msg.voiceUrl} />}
              {isOwn && (
                <button onClick={() => deleteMessage(msg)} style={{ color: "red" }}>❌</button>
              )}
              <div style={timeStyle}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div style={inputWrapper}>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            style={{ ...inputStyle, flex: 1 }}
            placeholder="Type a message"
            value={message}
            onChange={handleTyping}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            disabled={recording}
          />
          <label style={iconButton}>
            📎<input type="file" onChange={handleImageUpload} style={{ display: "none" }} />
          </label>
          <button onClick={() => setShowEmojiPicker((s) => !s)} style={iconButton}>😊</button>
          {!recording ? (
            <button onClick={startRecording} style={{ ...iconButton, color: "#f33" }}>🎤</button>
          ) : (
            <button onClick={stopRecording} style={{ ...iconButton, color: "#a00" }}>■</button>
          )}
        </div>

        {showEmojiPicker && (
          <div style={emojiPicker}>
            {["😀","😍","👍"].map((e) => (
              <span key={e} onClick={() => addEmoji(e)} style={{ fontSize:24, margin:5 }}>{e}</span>
            ))}
          </div>
        )}

        <button onClick={sendMessage} style={{ ...btnStyle, marginTop:8 }} disabled={recording || !message.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}

// Styles (same as before)…const chatWrapper = {
  display: "flex",
  flexDirection: "column",
  height: "100vh",
  backgroundImage: "url('/assets/temp_1738232491498.png')",
  backgroundSize: "cover",
  backgroundPosition: "center",
  fontFamily: "Poppins, sans-serif",
};

const chatHeader = {
  padding: "12px",
  backgroundColor: "#00ffcc",
  color: "#000",
  fontWeight: "bold",
  fontSize: "16px",
  textAlign: "center",
  borderBottom: "1px solid #ccc",
};

const messagesContainer = {
  flex: 1,
  padding: "15px",
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  backgroundColor: "rgba(255,255,255,0.05)",
};

const msgStyle = {
  padding: "10px 14px",
  borderRadius: "12px",
  fontSize: "15px",
  lineHeight: "1.4",
  maxWidth: "80%",
  wordBreak: "break-word",
  boxShadow: "0 1px 5px rgba(0,0,0,0.1)",
};

const timeStyle = {
  fontSize: "11px",
  color: "#ccc",
  textAlign: "right",
  marginTop: "4px",
};

const inputWrapper = {
  display: "flex",
  flexDirection: "column",
  padding: "10px",
  borderTop: "1px solid #333",
  backgroundColor: "rgba(255,255,255,0.1)",
};

const inputStyle = {
  padding: "12px",
  borderRadius: "6px",
  border: "none",
  fontSize: "16px",
  backgroundColor: "#fff",
  color: "#000",
  outline: "none",
};

const btnStyle = {
  padding: "12px",
  backgroundColor: "#00ffcc",
  color: "#000",
  border: "none",
  borderRadius: "6px",
  fontWeight: "bold",
  cursor: "pointer",
};

const iconButton = {
  cursor: "pointer",
  fontSize: "24px",
  background: "transparent",
  border: "none",
  color: "#00ffcc",
  userSelect: "none",
};

const emojiPicker = {
  marginTop: "10px",
  padding: "10px",
  backgroundColor: "#222",
  borderRadius: "8px",
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "center",
};

