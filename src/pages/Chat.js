import React, { useState, useEffect, useRef } from "react";
import { db, storage } from "../firebase"; // make sure storage is imported
import { ref as dbRef, push, onValue } from "firebase/database";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";

export default function Chat() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef(null);

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

  const sendMessage = () => {
    if (name && (message.trim() !== "")) {
      push(dbRef(db, "messages"), {
        name,
        text: message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: "text"
      });
      setMessage("");
    }
  };

  // Handle image upload
  const handleImageUpload = (e) => {
    if (!name) return alert("Please enter your name first");

    const file = e.target.files[0];
    if (!file) return;

    const fileRef = storageRef(storage, `chatImages/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(fileRef, file);

    uploadTask.on(
      "state_changed",
      null,
      (error) => {
        console.error("Upload failed", error);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          push(dbRef(db, "messages"), {
            name,
            imageUrl: downloadURL,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: "image"
          });
        });
      }
    );
  };

  // Handle emoji pick (simple toggle + insert emoji)
  const addEmoji = (emoji) => {
    setMessage(prev => prev + emoji);
  };

  return (
    <div style={chatWrapper}>
      <div style={chatHeader}>
        <h2>💬 Welcome to Chatroom</h2>
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
                backgroundColor: isOwn ? "#dcf8c6" : "#333",
                color: isOwn ? "#000" : "#fff",
                borderTopRightRadius: isOwn ? 0 : "10px",
                borderTopLeftRadius: isOwn ? "10px" : 0,
              }}
            >
              <div style={{ fontWeight: "bold", marginBottom: "4px" }}>{msg.name}</div>
              {msg.type === "image" ? (
                <img
                  src={msg.imageUrl}
                  alt="sent pic"
                  style={{ maxWidth: "200px", borderRadius: "8px", cursor: "pointer" }}
                  onClick={() => window.open(msg.imageUrl, "_blank")}
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
          />
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                placeholder="Type your message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              />
              {/* Image upload button */}
              <label style={iconButton} title="Send Image">
                📎
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleImageUpload}
                />
              </label>

              {/* Emoji picker button */}
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                style={iconButton}
                title="Add Emoji"
              >
                😊
              </button>
            </div>

            <button onClick={sendMessage} style={btnStyle}>Send</button>

            {/* Simple emoji picker */}
            {showEmojiPicker && (
              <div style={emojiPicker}>
                {["😀", "😂", "😍", "😎", "👍", "🙏", "🔥", "❤️"].map((emoji) => (
                  <span
                    key={emoji}
                    style={{ fontSize: "24px", cursor: "pointer", margin: "5px" }}
                    onClick={() => addEmoji(emoji)}
                  >
                    {emoji}
                  </span>
                ))}
              </div>
            )}
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
  backgroundColor: "#121212",
  fontFamily: "Poppins, sans-serif"
};

const chatHeader = {
  padding: "15px",
  backgroundColor: "#00ffcc",
  color: "#000",
  fontWeight: "bold",
  fontSize: "18px",
  textAlign: "center"
};

const messagesContainer = {
  flex: 1,
  padding: "15px",
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: "12px"
};

const msgStyle = {
  padding: "10px 14px",
  borderRadius: "12px",
  maxWidth: "75%",
  boxShadow: "0 0 5px rgba(0,0,0,0.2)",
  fontSize: "15px",
  lineHeight: "1.4"
};

const timeStyle = {
  fontSize: "11px",
  color: "#888",
  textAlign: "right",
  marginTop: "4px"
};

const inputWrapper = {
  display: "flex",
  flexDirection: "column",
  padding: "10px",
  borderTop: "1px solid #333"
};

const inputStyle = {
  padding: "12px",
  borderRadius: "6px",
  border: "none",
  fontSize: "16px",
  marginBottom: "8px"
};

const btnStyle = {
  padding: "12px",
  backgroundColor: "#00ffcc",
  color: "#000",
  border: "none",
  borderRadius: "6px",
  fontWeight: "bold",
  cursor: "pointer"
};

const iconButton = {
  cursor: "pointer",
  fontSize: "24px",
  background: "transparent",
  border: "none",
  color: "#00ffcc",
  userSelect: "none"
};

const emojiPicker = {
  marginTop: "10px",
  padding: "10px",
  backgroundColor: "#222",
  borderRadius: "8px",
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "center"
};
