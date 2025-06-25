import React, { useState, useEffect, useRef } from "react";
import { db, storage } from "../firebase";
import {
  ref as dbRef,
  push,
  onValue,
  remove,
  get,
} from "firebase/database";
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

export default function Chat() {
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState(null);
  const [userImage, setUserImage] = useState(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const messagesEndRef = useRef(null);

  // Fetch current user info once on mount
  useEffect(() => {
    // Assume user is authenticated and their UID is available
    // Adjust to your auth system if needed
    // For example, get current user UID from auth.currentUser.uid
    const uid = window?.firebaseAuthUserUID || null; // Replace with actual user UID retrieval

    if (!uid) return;

    setUserId(uid);

    // Fetch user profile info (name, image)
    get(dbRef(db, `users/${uid}`)).then((snap) => {
      if (snap.exists()) {
        const data = snap.val();
        setUserName(data.name || "User");
        setUserImage(data.image || null);
      } else {
        setUserName("User");
      }
    });
  }, []);

  // Listen to messages updates
  useEffect(() => {
    const chatRef = dbRef(db, "messages");
    const unsubscribe = onValue(chatRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Sort messages by timestamp ascending
        const msgs = Object.entries(data)
          .map(([id, msg]) => ({ id, ...msg }))
          .sort((a, b) => a.timestamp - b.timestamp);
        setMessages(msgs);
      } else {
        setMessages([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send text message
  const sendMessage = () => {
    if (!userName || !message.trim()) return;
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
  };

  // Handle image upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileRef = storageRef(storage, `chatImages/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(fileRef, file);

    uploadTask.on(
      "state_changed",
      null,
      (error) => console.error("Upload failed", error),
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          push(dbRef(db, "messages"), {
            uid: userId,
            name: userName,
            image: userImage || null,
            type: "image",
            imageUrl: downloadURL,
            timestamp: Date.now(),
            status: "sent",
          });
        });
      }
    );
  };

  // Start voice recording
  const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Audio recording not supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        uploadVoiceNote(blob);
      };
      mediaRecorderRef.current.start();
      setRecording(true);
    } catch (err) {
      alert("Could not start recording: " + err.message);
    }
  };

  // Stop voice recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  // Upload voice note to Firebase Storage & push message
  const uploadVoiceNote = (blob) => {
    const fileRef = storageRef(storage, `voiceNotes/${Date.now()}.webm`);
    const uploadTask = uploadBytesResumable(fileRef, blob);

    uploadTask.on(
      "state_changed",
      null,
      (error) => console.error("Voice upload failed", error),
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          push(dbRef(db, "messages"), {
            uid: userId,
            name: userName,
            image: userImage || null,
            type: "voice",
            voiceUrl: downloadURL,
            timestamp: Date.now(),
            status: "sent",
          });
        });
      }
    );
  };

  // Delete message and if voice/image delete storage too
  const deleteMessage = async (msg) => {
    if (!window.confirm("Delete this message?")) return;
    try {
      await remove(dbRef(db, `messages/${msg.id}`));
      if (msg.type === "image" && msg.imageUrl) {
        const imgRef = storageRef(storage, msg.imageUrl);
        // Can't delete by URL directly; need to parse storage path
        // Assuming storage URL contains '/o/' + encoded path after domain:
        const path = decodeURIComponent(msg.imageUrl.split("/o/")[1].split("?")[0]);
        await deleteObject(storageRef(storage, path));
      }
      if (msg.type === "voice" && msg.voiceUrl) {
        const path = decodeURIComponent(msg.voiceUrl.split("/o/")[1].split("?")[0]);
        await deleteObject(storageRef(storage, path));
      }
    } catch (err) {
      console.error("Error deleting message/storage", err);
    }
  };

  // Emoji add helper
  const addEmoji = (emoji) => setMessage((prev) => prev + emoji);

  // Message status display
  const messageStatus = (status) => (status === "sent" ? "✅" : "✅✅");

  return (
    <div style={chatWrapper}>
      <div style={chatHeader}>
        <h2 style={{ fontSize: "16px", margin: 0 }}>💬 Welcome to Chatroom</h2>
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
                borderTopRightRadius: isOwn ? 0 : "10px",
                borderTopLeftRadius: isOwn ? "10px" : 0,
                maxWidth: "75%",
                marginBottom: "10px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 4,
                  color: "#99ccff",
                  fontWeight: "bold",
                }}
              >
                {msg.image ? (
                  <img
                    src={msg.image}
                    alt="User"
                    style={{ width: 32, height: 32, borderRadius: "50%" }}
                  />
                ) : (
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      backgroundColor: "#99ccff",
                      textAlign: "center",
                      lineHeight: "32px",
                      fontWeight: "bold",
                      color: "#003366",
                    }}
                  >
                    {msg.name?.charAt(0).toUpperCase() || "U"}
                  </div>
                )}
                <span>{msg.name}</span>
              </div>

              {/* Message Content */}
              {msg.type === "text" && <div>{msg.text}</div>}

              {msg.type === "image" && (
                <img
                  src={msg.imageUrl}
                  alt="sent pic"
                  style={{ maxWidth: "200px", borderRadius: 8, cursor: "pointer" }}
                  onClick={() => window.open(msg.imageUrl, "_blank")}
                />
              )}

              {msg.type === "voice" && (
                <audio controls src={msg.voiceUrl} style={{ maxWidth: "200px", outline: "none" }} />
              )}

              {/* Delete button for own messages */}
              {isOwn && (
                <button
                  onClick={() => deleteMessage(msg)}
                  style={{
                    marginTop: 6,
                    background: "transparent",
                    border: "none",
                    color: "red",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                  title="Delete message"
                >
                  ❌
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
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            style={{ ...inputStyle, flex: 1 }}
            placeholder="Type your message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            disabled={recording}
          />

          {/* Upload Image */}
          <label style={iconButton} title="Send Image">
            📎
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleImageUpload}
              disabled={recording}
            />
          </label>

          {/* Emoji picker toggle */}
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            style={iconButton}
            title="Add Emoji"
            disabled={recording}
          >
            😊
          </button>

          {/* Voice Recording toggle */}
          {!recording ? (
            <button
              onClick={startRecording}
              style={{ ...iconButton, color: "#f33" }}
              title="Start Voice Recording"
            >
              🎤
            </button>
          ) : (
            <button
              onClick={stopRecording}
              style={{ ...iconButton, color: "#a00" }}
              title="Stop Recording"
            >
              ■
            </button>
          )}
        </div>

        {/* Emoji picker */}
        {showEmojiPicker && (
          <div style={emojiPicker}>
            {["😀", "😂", "😍", "😎", "👍", "🙏", "🔥", "❤️"].map((emoji) => (
              <span
                key={emoji}
                style={{ fontSize: 24, cursor: "pointer", margin: 5 }}
                onClick={() => addEmoji(emoji)}
              >
                {emoji}
              </span>
            ))}
          </div>
        )}

        {/* Send button */}
        <button
          onClick={sendMessage}
          style={{ ...btnStyle, marginTop: 8 }}
          disabled={recording || message.trim() === ""}
        >
          Send
        </button>
      </div>
    </div>
  );
}

const chatWrapper = {
  display: "flex",
  flexDirection: "column",
  height: "100vh",
  backgroundImage: "url('/assets/temp_1738232491498.png')",
  backgroundSize: "cover",
  fontFamily: "Poppins, sans-serif",
};

const chatHeader = {
  padding: "10px",
  backgroundColor: "#00ffcc",
  color: "#000",
  fontWeight: "bold",
  fontSize: "16px",
  textAlign: "center",
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
  padding: "10px 14px",
  borderRadius: "12px",
  fontSize: "15px",
  lineHeight: "1.4",
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

const inputStyle = {
  padding: "12px",
  borderRadius: "6px",
  border: "none",
  fontSize: "16px",
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
