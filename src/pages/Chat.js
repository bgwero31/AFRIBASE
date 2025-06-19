import React, { useEffect, useState, useRef } from "react";
import { db } from "../firebase";
import { ref, push, onValue } from "firebase/database";

export default function Chat() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const chatEndRef = useRef(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    const chatRef = ref(db, "messages");
    onValue(chatRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messageArray = Object.values(data).sort((a, b) => a.time - b.time);
        setMessages(messageArray);
        scrollToBottom();
      }
    });
  }, []);

  const sendMessage = () => {
    if (name.trim() && message.trim()) {
      push(ref(db, "messages"), {
        name: name.trim(),
        text: message.trim(),
        time: Date.now()
      });
      setMessage("");
    }
  };

  return (
    <div style={containerStyle}>
      <h2>💬 Afribase Chat Room</h2>

      <input
        placeholder="Enter your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={inputStyle}
      />
      <input
        placeholder="Type your message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={(e) => e.key === "Enter" && sendMessage()}
        style={inputStyle}
      />
      <button onClick={sendMessage} style={buttonStyle}>Send</button>

      <div style={chatBoxStyle}>
        {messages.map((msg, i) => (
          <div key={i} style={msgStyle}>
            <strong>{msg.name}</strong>: {msg.text}
            <div style={timeStyle}>
              {new Date(msg.time).toLocaleTimeString()}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
    </div>
  );
}

const containerStyle = {
  padding: "20px",
  maxWidth: "600px",
  margin: "auto"
};

const inputStyle = {
  width: "100%",
  padding: "10px",
  margin: "10px 0",
  fontSize: "16px",
  borderRadius: "5px",
  border: "1px solid #ccc"
};

const buttonStyle = {
  padding: "10px 20px",
  backgroundColor: "#00ffcc",
  color: "#000",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
  marginBottom: "20px"
};

const chatBoxStyle = {
  maxHeight: "400px",
  overflowY: "auto",
  backgroundColor: "#111",
  padding: "15px",
  borderRadius: "10px"
};

const msgStyle = {
  background: "#222",
  color: "#fff",
  padding: "10px",
  margin: "5px 0",
  borderRadius: "6px",
  position: "relative"
};

const timeStyle = {
  fontSize: "12px",
  color: "#aaa",
  marginTop: "5px"
};
