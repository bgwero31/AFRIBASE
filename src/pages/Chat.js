import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { ref, push, onValue } from "firebase/database";

export default function Chat() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const chatRef = ref(db, "messages");
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
    if (name && message.trim()) {
      push(ref(db, "messages"), {
        name,
        text: message.trim(),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
      setMessage("");
    }
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
              }}
            >
              <div style={{ fontWeight: "bold", marginBottom: "4px" }}>{msg.name}</div>
              <div>{msg.text}</div>
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
          <div style={{ display: "flex", gap: "10px" }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              placeholder="Type your message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button onClick={sendMessage} style={btnStyle}>Send</button>
          </div>
        )}
      </div>
    </div>
  );
}

const chatWrapper = {
  display: "flex",
  flexDirection: "column",
  height: "100vh",
  background: "url('https://www.transparenttextures.com/patterns/dark-mosaic.png')",
  backgroundColor: "#121212",
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
  color: "#000"
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
  maxWidth: "70%",
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
  backgroundColor: "#1b1b1b"
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
