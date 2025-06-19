import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { ref, push, onValue } from "firebase/database";

export default function Chat() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const chatRef = ref(db, "messages");
    onValue(chatRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messageArray = Object.values(data);
        setMessages(messageArray);
      }
    });
  }, []);

  const sendMessage = () => {
    if (name && message) {
      push(ref(db, "messages"), {
        name,
        text: message,
        time: Date.now()
      });
      setMessage("");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>💬 Afribase Chat</h2>
      <input
        placeholder="Your Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={inputStyle}
      />
      <input
        placeholder="Type your message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        style={inputStyle}
      />
      <button onClick={sendMessage} style={buttonStyle}>Send</button>

      <div style={{ marginTop: "30px" }}>
        {messages.map((msg, i) => (
          <div key={i} style={msgStyle}>
            <strong>{msg.name}: </strong>{msg.text}
          </div>
        ))}
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "10px",
  margin: "10px 0",
  fontSize: "16px"
};

const buttonStyle = {
  padding: "10px 20px",
  backgroundColor: "#00ffcc",
  color: "#000",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer"
};

const msgStyle = {
  background: "#222",
  padding: "10px",
  margin: "5px 0",
  borderRadius: "6px"
};
