import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { db, storage } from "../firebase"; // make sure you have storage imported from firebase config
import { ref as dbRef, push, onValue, set } from "firebase/database";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

export default function Chat() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const chatRef = dbRef(db, "messages");
    onValue(chatRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setMessages(Object.values(data));
      }
    });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Typing indicator simulation
  useEffect(() => {
    if (!message) {
      setTyping(false);
      return;
    }
    setTyping(true);
    const timeout = setTimeout(() => setTyping(false), 1000);
    return () => clearTimeout(timeout);
  }, [message]);

  const sendMessage = () => {
    if (name && message.trim()) {
      push(dbRef(db, "messages"), {
        name,
        text: message.trim(),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        type: "text"
      });
      setMessage("");
    }
  };

  const sendFile = async (file) => {
    if (!name || !file) return;

    setFileUploading(true);
    try {
      const fileRef = storageRef(storage, `chat_files/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);

      push(dbRef(db, "messages"), {
        name,
        text: url,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        type: "image"
      });
    } catch (error) {
      alert("File upload failed: " + error.message);
    }
    setFileUploading(false);
  };

  // Emoji picker basic (use emoji unicode directly)
  const addEmoji = (emoji) => {
    setMessage((prev) => prev + emoji);
  };

  return (
    <div style={chatWrapper}>
      <div style={chatHeader}>
        <button onClick={() => navigate("/")} style={backBtn}>← Back</button>
        <h2 style={{ margin: 0 }}>💬 Afribase Chatroom</h2>
      </div>

      <div style={messagesContainer}>
        {messages.map((msg, i) => {
          const isOwn = msg.name === name;
          return (
            <div
              key={i}
              style={{
                ...msgStyle,
                alignSelf: isOwn ? "flex-end" : "flex-start",
                backgroundColor: isOwn ? "#00ffcc" : "#2c2c2c",
                color: isOwn ? "#000" : "#fff",
                borderBottomLeftRadius: isOwn ? "12px" : "0px",
                borderBottomRightRadius: isOwn ? "0px" : "12px",
                maxWidth: "75%",
                wordWrap: "break-word",
              }}
            >
              <div style={{ fontWeight: "bold", marginBottom: "4px" }}>{msg.name}</div>

              {msg.type === "image" ? (
                <img
                  src={msg.text}
                  alt="sent file"
                  style={{ maxWidth: "100%", borderRadius: "10px", cursor: "pointer" }}
                  onClick={() => window.open(msg.text, "_blank")}
                />
              ) : (
                <div>{msg.text}</div>
              )}

              <div style={timeStyle}>{msg.time}</div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div style={inputWrapper}>
        {!name ? (
          <input
            style={inputStyle}
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={fileUploading}
          />
        ) : (
          <>
            <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
              {/* Emoji buttons */}
              {["😊", "😂", "🔥", "❤️", "👍"].map((emoji) => (
                <button
                  key={emoji}
                  style={emojiBtn}
                  onClick={() => addEmoji(emoji)}
                  disabled={fileUploading}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                placeholder="Type your message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                disabled={fileUploading}
              />
              <label style={uploadLabel}>
                📎
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => sendFile(e.target.files[0])}
                  style={{ display: "none" }}
                  disabled={fileUploading}
                />
              </label>
              <button onClick={sendMessage} style={btnStyle} disabled={fileUploading || !message.trim()}>
                Send
              </button>
            </div>

            {typing && <div style={typingIndicator}>Typing...</div>}
            {fileUploading && <div style={typingIndicator}>Uploading file...</div>}
          </>
        )}
      </div>
    </div>
  );
}

const chatWrapper = {
  display: "flex",
  flexDirection: "column",
  height: "100vh",
  background:
    "url('https://www.transparenttextures.com/patterns/dark-mosaic.png'), #121212",
  color: "#fff",
  fontFamily: "Poppins, sans-serif",
};

const chatHeader = {
  padding: "15px",
  backgroundColor: "#00ffcc",
  color: "#000",
  fontWeight: "bold",
  fontSize: "18px",
  textAlign: "center",
  position: "relative",
};

const backBtn = {
  position: "absolute",
  left: "15px",
  top: "15px",
  background: "none",
  border: "none",
  fontSize: "18px",
  cursor: "pointer",
  color: "#000",
};

const messagesContainer = {
  flex: 1,
  padding: "15px",
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const msgStyle = {
  padding: "12px 16px",
  borderRadius: "12px",
  maxWidth: "75%",
  boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
  fontSize: "15px",
  lineHeight: "1.5",
};

const timeStyle = {
  fontSize: "11px",
  color: "#aaa",
  textAlign: "right",
  marginTop: "6px",
};

const inputWrapper = {
  padding: "12px",
  borderTop: "1px solid #333",
  backgroundColor: "#1b1b1b",
};

const inputStyle = {
  padding: "12px",
  borderRadius: "8px",
  border: "none",
  fontSize: "16px",
};

const btnStyle = {
  padding: "12px 16px",
  backgroundColor: "#00ffcc",
  color: "#000",
  border: "none",
  borderRadius: "8px",
  fontWeight: "bold",
  cursor: "pointer",
};

const emojiBtn = {
  background: "none",
  border: "none",
  fontSize: "22px",
  cursor: "pointer",
  color: "#00ffcc",
};

const uploadLabel = {
  backgroundColor: "#00ffcc",
  color: "#000",
  borderRadius: "8px",
  padding: "8px 12px",
  fontSize: "18px",
  cursor: "pointer",
  userSelect: "none",
  display: "flex",
  alignItems: "center",
};

const typingIndicator = {
  marginTop: "8px",
  fontSize: "14px",
  color: "#aaa",
};
