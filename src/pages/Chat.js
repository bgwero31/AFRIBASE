import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { ref, push, onValue } from "firebase/database";

export default function Chat() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

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
    if (name && message) {
      push(ref(db, "messages"), {
        name,
        text: message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
      setMessage("");
    }
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
          <>
            <input
              style={inputStyle}
              placeholder="Type your message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button onClick={sendMessage} style={btnStyle}>Send</button>
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
