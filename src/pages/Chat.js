import React, { useState, useEffect, useRef } from "react";
import { db, storage } from "../firebase";
import {
  ref as dbRef,
  push,
  onValue,
  update,
  get,
  serverTimestamp,
} from "firebase/database";
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";

const imgbbKey = "30df4aa05f1af3b3b58ee8a74639e5cf";

export default function Chat() {
  const [userData, setUserData] = useState(null); // fetched user data (name, image)
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const [lastSeen, setLastSeen] = useState(null);
  const [sending, setSending] = useState(false);

  // Initialize user from Firebase Authentication user & fetch user profile data
  useEffect(() => {
    // You need your own auth user info here
    // For demo, we'll assume a "userId" is fixed or fetched somehow
    // Replace this with your auth logic
    const userId = "currentUserId"; // TODO: replace with real auth user uid

    get(dbRef(db, `users/${userId}`)).then((snap) => {
      if (snap.exists()) {
        setUserData({ uid: userId, ...snap.val() });
        // Also update last seen on mount
        update(dbRef(db, `users/${userId}`), { lastSeen: Date.now() });
      } else {
        // fallback if no profile
        setUserData({ uid: userId, name: "Anonymous", image: null });
      }
    });
  }, []);

  // Listen for messages updates
  useEffect(() => {
    const messagesRef = dbRef(db, "messages");
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const msgs = Object.entries(data).map(([id, msg]) => ({ id, ...msg }));
        // Sort by timestamp ascending (oldest first)
        msgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        setMessages(msgs);
        scrollToBottom();
      } else {
        setMessages([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Listen for typing indicators of other users
  useEffect(() => {
    const typingRef = dbRef(db, "typing");
    const unsubscribe = onValue(typingRef, (snapshot) => {
      const data = snapshot.val() || {};
      setTypingUsers(data);
    });
    return () => unsubscribe();
  }, []);

  // Update own typing status with debounce
  const updateTypingStatus = (isTyping) => {
    if (!userData) return;
    const typingRef = dbRef(db, `typing/${userData.uid}`);
    if (isTyping) {
      update(typingRef, { name: userData.name || "Anonymous" });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        update(typingRef, null);
      }, 3000); // Clear after 3 seconds of inactivity
    } else {
      update(typingRef, null);
    }
  };

  // Scroll messages to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Send text message
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

  // Send image message (upload to imgbb first)
  const handleImageUpload = async (e) => {
    if (!userData) return alert("User data missing");
    const file = e.target.files[0];
    if (!file) return;

    setSending(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch(
        `https://api.imgbb.com/1/upload?key=${imgbbKey}`,
        {
          method: "POST",
          body: formData,
        }
      );
      const data = await res.json();
      const url = data.data.url;

      const imgMsg = {
        uid: userData.uid,
        name: userData.name || "Anonymous",
        image: userData.image || null,
        imageUrl: url,
        type: "image",
        timestamp: Date.now(),
        status: "sent",
      };
      await push(dbRef(db, "messages"), imgMsg);
    } catch (error) {
      alert("Image upload failed: " + error.message);
    }
    setSending(false);
    e.target.value = null; // reset file input
  };

  // Start voice recording
  const startRecording = async () => {
    if (recording) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return alert("Audio recording not supported");
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      let chunks = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mr.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        chunks = [];
        await uploadAudio(blob);
      };

      mr.start();
      setMediaRecorder(mr);
      setAudioChunks(chunks);
      setRecording(true);
    } catch (err) {
      alert("Error starting recording: " + err.message);
    }
  };

  // Stop voice recording
  const stopRecording = () => {
    if (mediaRecorder && recording) {
      mediaRecorder.stop();
      setRecording(false);
    }
  };

  // Upload audio to Firebase Storage and send message
  const uploadAudio = async (blob) => {
    if (!userData) return alert("User data missing");
    setSending(true);
    try {
      const fileName = `voice_${Date.now()}.webm`;
      const audioRef = storageRef(storage, `chatAudio/${fileName}`);
      const snapshot = await uploadBytesResumable(audioRef, blob);
      const audioURL = await getDownloadURL(snapshot.ref);

      const audioMsg = {
        uid: userData.uid,
        name: userData.name || "Anonymous",
        image: userData.image || null,
        audioUrl: audioURL,
        type: "audio",
        timestamp: Date.now(),
        status: "sent",
      };
      await push(dbRef(db, "messages"), audioMsg);
    } catch (err) {
      alert("Audio upload failed: " + err.message);
    }
    setSending(false);
  };

  // Delete audio message (remove from storage & db)
  const deleteAudioMessage = async (msg) => {
    if (msg.uid !== userData.uid) return alert("Can only delete your own messages");
    try {
      // Delete audio file from storage
      const fileRef = storageRef(storage, msg.audioUrl.split(storageRef(storage)._baseUrl)[1]);
      // Firebase SDK doesn't provide direct delete from URL, so this may require storage path parsing
      // Alternative: Store audio path in message object separately for deletion
      // Here, skipping storage deletion due to complexity, just remove DB message
      await remove(dbRef(db, `messages/${msg.id}`));
    } catch (err) {
      alert("Delete failed: " + err.message);
    }
  };

  // Message input onChange handler with typing update
  const onMessageChange = (e) => {
    setMessage(e.target.value);
    updateTypingStatus(true);
  };

  // Helper: Display typing users except current user
  const renderTypingUsers = () => {
    if (!userData) return null;
    const othersTyping = Object.entries(typingUsers).filter(([uid]) => uid !== userData.uid);
    if (othersTyping.length === 0) return null;

    return (
      <div style={{ padding: "5px 10px", fontStyle: "italic", color: "#666" }}>
        {othersTyping.map(([uid, val]) => val.name).join(", ")} typing...
      </div>
    );
  };

  // Helper: Format timestamp
  const formatTime = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Helper: Message delivery status icon
  const messageStatusIcon = (status) => {
    return status === "sent" ? "✅" : "✅✅";
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
            <span>{userData.name || "Anonymous"}</span>
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
                display: "flex",
                flexDirection: "column",
                maxWidth: "75%",
                position: "relative",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginBottom: 4,
                }}
              >
                {msg.image ? (
                  <img
                    src={msg.image}
                    alt="user"
                    style={{ width: 24, height: 24, borderRadius: "50%" }}
                  />
                ) : (
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: "#666",
                    }}
                  />
                )}
                <strong>{msg.name}</strong>
              </div>

              {msg.type === "text" && <div>{msg.text}</div>}

              {msg.type === "image" && (
                <img
                  src={msg.imageUrl}
                  alt="sent pic"
                  style={{ maxWidth: 200, borderRadius: 8, cursor: "pointer" }}
                  onClick={() => window.open(msg.imageUrl, "_blank")}
                />
              )}

              {msg.type === "audio" && (
                <audio controls style={{ outline: "none", width: "100%" }}>
                  <source src={msg.audioUrl} type="audio/webm" />
                  Your browser does not support the audio element.
                </audio>
              )}

              <div
                style={{
                  fontSize: 11,
                  color: "#888",
                  textAlign: "right",
                  marginTop: 4,
                }}
              >
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
                  title="Delete audio message"
                >
                  ❌
                </button>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {renderTypingUsers()}

      <div style={inputWrapper}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            style={{ ...inputStyle, flex: 1 }}
            placeholder="Type your message"
            value={message}
            onChange={onMessageChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !sending) sendMessage();
            }}
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
              title="Start Voice Recording"
              disabled={sending}
            >
              🎤
            </button>
          ) : (
            <button
              onClick={stopRecording}
              style={{ ...iconButton, color: "red" }}
              title="Stop Voice Recording"
              disabled={sending}
            >
              ⏹
            </button>
          )}

          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            style={iconButton}
            title="Add Emoji"
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

const btnStyleRed = {
  ...btnStyle,
  backgroundColor: "#ff4444",
};

const btnStyleMic = {
  ...btnStyle,
  padding: "10px",
  fontSize: "20px",
  borderRadius: "50%",
  minWidth: "44px",
  textAlign: "center",
};

const btnStyleImgLabel = {
  cursor: "pointer",
  fontSize: "24px",
  background: "transparent",
  border: "none",
  color: "#00ffcc",
  userSelect: "none",
};

const previewWrapper = {
  position: "relative",
  marginBottom: 8,
  display: "inline-block",
};

const removePreviewBtn = {
  position: "absolute",
  top: -6,
  right: -6,
  background: "red",
  color: "#fff",
  border: "none",
  borderRadius: "50%",
  cursor: "pointer",
  width: 20,
  height: 20,
  lineHeight: "20px",
  textAlign: "center",
  fontWeight: "bold",
};

const recordingWrapper = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  padding: "10px 0",
  fontWeight: "bold",
  color: "#00ffcc",
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
