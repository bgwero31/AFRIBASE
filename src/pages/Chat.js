// ✅ Chat.js — PART 1 (Full fix with emojis, typing, audio, Firebase name, etc.)
import React, { useState, useEffect, useRef } from "react";
import { db, storage } from "../firebase";
import {
  ref as dbRef,
  push,
  onValue,
  update,
  get,
  remove,
} from "firebase/database";
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";

const imgbbKey = "30df4aa05f1af3b3b58ee8a74639e5cf";

export default function Chat() {
  const [userData, setUserData] = useState(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const userId = localStorage.getItem("userId"); // Replace with real auth logic

    get(dbRef(db, `users/${userId}`)).then((snap) => {
      if (snap.exists()) {
        setUserData({ uid: userId, ...snap.val() });
        update(dbRef(db, `users/${userId}`), { lastSeen: Date.now() });
      } else {
        setUserData({ uid: userId, name: "Anonymous", image: null });
      }
    });
  }, []);

  useEffect(() => {
    const messagesRef = dbRef(db, "messages");
    return onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const msgs = Object.entries(data).map(([id, msg]) => ({ id, ...msg }));
        msgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        setMessages(msgs);
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      } else {
        setMessages([]);
      }
    });
  }, []);

  useEffect(() => {
    const typingRef = dbRef(db, "typing");
    return onValue(typingRef, (snapshot) => {
      const data = snapshot.val() || {};
      setTypingUsers(data);
    });
  }, []);

  const updateTypingStatus = (isTyping) => {
    if (!userData) return;
    const typingRef = dbRef(db, `typing/${userData.uid}`);
    if (isTyping) {
      update(typingRef, { name: userData.name || "Anonymous" });
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        update(typingRef, null);
      }, 3000);
    } else {
      update(typingRef, null);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !userData || sending) return;
    setSending(true);
    const newMsg = {
      uid: userData.uid,
      name: userData.name || "Anonymous",
      image: userData.image || null,
      text: message.trim(),
      type: "text",
      timestamp: Date.now(),
      status: "sent",
    };
    await push(dbRef(db, "messages"), newMsg);
    setMessage("");
    updateTypingStatus(false);
    setSending(false);
  };

  const handleImageUpload = async (e) => {
    if (!userData) return;
    const file = e.target.files[0];
    if (!file) return;

    setSending(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch(
        `https://api.imgbb.com/1/upload?key=${imgbbKey}`,
        { method: "POST", body: formData }
      );
      const data = await res.json();
      const url = data.data.url;

      const imgMsg = {
        uid: userData.uid,
        name: userData.name,
        image: userData.image,
        imageUrl: url,
        type: "image",
        timestamp: Date.now(),
        status: "sent",
      };
      await push(dbRef(db, "messages"), imgMsg);
    } catch (err) {
      alert("Image upload failed: " + err.message);
    }
    setSending(false);
  };

  const startRecording = async () => {
    if (recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      let chunks = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mr.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const fileName = `voice_${Date.now()}.webm`;
        const audioRef = storageRef(storage, `chatAudio/${fileName}`);
        const snapshot = await uploadBytesResumable(audioRef, blob);
        const audioURL = await getDownloadURL(snapshot.ref);

        const audioMsg = {
          uid: userData.uid,
          name: userData.name,
          image: userData.image,
          audioUrl: audioURL,
          type: "audio",
          timestamp: Date.now(),
          status: "sent",
        };
        await push(dbRef(db, "messages"), audioMsg);
      };

      mr.start();
      setMediaRecorder(mr);
      setRecording(true);
    } catch (err) {
      alert("Recording error: " + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setRecording(false);
    }
  };

  const deleteAudioMessage = async (msg) => {
    if (msg.uid !== userData.uid) return;
    await remove(dbRef(db, `messages/${msg.id}`));
  };

  const onMessageChange = (e) => {
    setMessage(e.target.value);
    updateTypingStatus(true);
  };

  const formatTime = (ts) => {
    if (!ts) return \"\";
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: \"2-digit\", minute: \"2-digit\" });
  };

  const messageStatusIcon = (status) => {
    return status === \"sent\" ? \"✅\" : \"✅✅\";
  };
return (
    <div style={chatWrapper}>
      <div style={chatHeader}>
        <h3>💬 Chatroom</h3>
        {userData && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {userData.image ? (
              <img
                src={userData.image}
                alt="profile"
                style={{ width: 32, height: 32, borderRadius: "50%" }}
              />
            ) : (
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#ccc" }} />
            )}
            <span>{userData.name}</span>
          </div>
        )}
      </div>

      <div style={messagesContainer}>
        {messages.map((msg) => {
          const isOwn = userData && msg.uid === userData.uid;
          return (
            <div
              key={msg.id}
              style={{
                ...msgStyle,
                alignSelf: isOwn ? "flex-end" : "flex-start",
                backgroundColor: isOwn ? "#dcf8c6" : "#333",
                color: isOwn ? "#000" : "#fff",
                borderTopRightRadius: isOwn ? 0 : "10px",
                borderTopLeftRadius: isOwn ? "10px" : 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                {msg.image ? (
                  <img
                    src={msg.image}
                    alt="user"
                    style={{ width: 24, height: 24, borderRadius: "50%" }}
                  />
                ) : (
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#666" }} />
                )}
                <strong>{msg.name}</strong>
              </div>

              {msg.type === "text" && <div>{msg.text}</div>}
              {msg.type === "image" && (
                <img
                  src={msg.imageUrl}
                  alt="pic"
                  style={{ maxWidth: 200, borderRadius: 8, cursor: "pointer" }}
                  onClick={() => window.open(msg.imageUrl, "_blank")}
                />
              )}
              {msg.type === "audio" && (
                <audio controls style={{ outline: "none", width: "100%" }}>
                  <source src={msg.audioUrl} type="audio/webm" />
                </audio>
              )}

              <div style={timeStyle}>
                {formatTime(msg.timestamp)} {messageStatusIcon(msg.status)}
              </div>

              {isOwn && msg.type === "audio" && (
                <button
                  onClick={() => deleteAudioMessage(msg)}
                  style={{
                    position: "absolute",
                    top: 2,
                    right: 2,
                    background: "transparent",
                    border: "none",
                    color: "red",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                  title="Delete"
                >
                  ❌
                </button>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {Object.entries(typingUsers)
        .filter(([uid]) => userData && uid !== userData.uid)
        .map(([uid, val]) => (
          <div
            key={uid}
            style={{ padding: "5px 10px", fontStyle: "italic", color: "#666" }}
          >
            {val.name} typing...
          </div>
        ))}

      <div style={inputWrapper}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            style={{ ...inputStyle, flex: 1 }}
            placeholder="Type a message"
            value={message}
            onChange={onMessageChange}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />

          <label style={iconButton} title="Send Image">
            📎
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleImageUpload}
              disabled={sending}
            />
          </label>

          {!recording ? (
            <button
              onClick={startRecording}
              style={iconButton}
              title="Record Voice"
              disabled={sending}
            >
              🎤
            </button>
          ) : (
            <button
              onClick={stopRecording}
              style={{ ...iconButton, color: "red" }}
              title="Stop Recording"
              disabled={sending}
            >
              ⏹
            </button>
          )}

          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            style={iconButton}
            title="Emoji"
            disabled={sending}
          >
            😊
          </button>
        </div>

        <button
          onClick={sendMessage}
          style={{ ...btnStyle, marginTop: 8 }}
          disabled={sending}
        >
          {sending ? "Sending..." : "Send"}
        </button>

        {showEmojiPicker && (
          <div style={emojiPicker}>
            {["😀", "😂", "😍", "😎", "👍", "🙏", "🔥", "❤️"].map((emoji) => (
              <span
                key={emoji}
                style={{ fontSize: 24, cursor: "pointer", margin: 5 }}
                onClick={() => setMessage((prev) => prev + emoji)}
              >
                {emoji}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Styles
const chatWrapper = {
  display: "flex",
  flexDirection: "column",
  height: "100vh",
  backgroundImage: "url('/assets/temp_1738232491498.png')",
  backgroundSize: "cover",
  fontFamily: "Poppins, sans-serif",
};

const chatHeader = {
  padding: "15px",
  backgroundColor: "#00ffcc",
  color: "#000",
  fontWeight: "bold",
  fontSize: "18px",
  textAlign: "center",
};

const messagesContainer = {
  flex: 1,
  padding: "15px",
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
};

const msgStyle = {
  padding: "10px 14px",
  borderRadius: "12px",
  boxShadow: "0 0 5px rgba(0,0,0,0.2)",
  fontSize: "15px",
  lineHeight: "1.4",
  position: "relative",
  maxWidth: "75%",
};

const timeStyle = {
  fontSize: "11px",
  color: "#888",
  textAlign: "right",
  marginTop: "4px",
};

const inputWrapper = {
  display: "flex",
  flexDirection: "column",
  padding: "10px",
  borderTop: "1px solid #333",
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

const inputStyle = {
  padding: "10px",
  fontSize: "15px",
  borderRadius: "6px",
  border: "1px solid #ccc",
};

const iconButton = {
  fontSize: "20px",
  cursor: "pointer",
  background: "transparent",
  border: "none",
};

const emojiPicker = {
  position: "absolute",
  bottom: 80,
  right: 10,
  background: "#fff",
  borderRadius: "10px",
  padding: "10px",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)",
  zIndex: 100,
};
