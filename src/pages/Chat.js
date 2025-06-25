import React, { useState, useEffect, useRef } from "react";
import { db, storage } from "../firebase";
import {
  ref as dbRef,
  push,
  onValue,
  update,
  onDisconnect,
} from "firebase/database";
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { getAuth } from "firebase/auth";

const imgbbKey = "30df4aa05f1af3b3b58ee8a74639e5cf";

function timeAgo(ts) {
  const diff = (Date.now() - ts) / 1000;
  if (diff < 5) return "just now";
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function Chat() {
  const auth = getAuth();
  const user = auth.currentUser;

  const [profile, setProfile] = useState(null); // {name, image}
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [sending, setSending] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const audioRefs = useRef({});

  // Fetch user profile on mount & setup online/lastSeen + typing
  useEffect(() => {
    if (!user) return;

    // Fetch profile name & image
    const userRef = dbRef(db, `users/${user.uid}`);
    onValue(userRef, (snap) => {
      if (snap.exists()) {
        setProfile(snap.val());
      }
    });

    // Set online true on connect
    update(userRef, { online: true, typing: false });

    // On disconnect set online false + lastSeen timestamp
    onDisconnect(userRef).update({
      online: false,
      lastSeen: Date.now(),
      typing: false,
    });

    return () => {
      // On unmount set typing false and online false for cleanup (optional)
      update(userRef, { typing: false, online: false });
    };
  }, [user]);

  // Listen to typing status of all users except current user
  useEffect(() => {
    const usersRef = dbRef(db, "users");
    const unsubscribe = onValue(usersRef, (snap) => {
      if (!snap.exists()) {
        setTypingUsers({});
        return;
      }
      const usersTyping = {};
      const data = snap.val();
      Object.entries(data).forEach(([uid, info]) => {
        if (uid !== user.uid && info.typing) {
          usersTyping[uid] = info.name || "Unknown";
        }
      });
      setTypingUsers(usersTyping);
    });
    return () => unsubscribe();
  }, [user]);

  // Listen to messages
  useEffect(() => {
    const messagesRef = dbRef(db, "messages");
    const unsubscribe = onValue(messagesRef, (snap) => {
      if (!snap.exists()) {
        setMessages([]);
        return;
      }
      const msgs = Object.entries(snap.val()).map(([id, msg]) => ({
        id,
        ...msg,
      }));
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, []);

  // Scroll to bottom on messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle typing status debounce
  useEffect(() => {
    if (!user) return;
    const userTypingRef = dbRef(db, `users/${user.uid}/typing`);

    if (isTyping) {
      update(userTypingRef, true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      typingTimeoutRef.current = setTimeout(() => {
        update(userTypingRef, false);
        setIsTyping(false);
      }, 2000);
    } else {
      update(userTypingRef, false);
    }
  }, [isTyping, user]);

  // Handle text input change
  const onChangeMessage = (e) => {
    setMessage(e.target.value);
    if (!isTyping) setIsTyping(true);
  };

  // Send message with optional image/audio
  const sendMessage = async () => {
    if (!user || sending) return;
    if (!message.trim() && !imageFile && !audioChunks.length) return;

    setSending(true);

    try {
      let imageUrl = null;
      let audioUrl = null;

      // Upload image if exists (imgbb)
      if (imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);
        const res = await fetch(
          `https://api.imgbb.com/1/upload?key=${imgbbKey}`,
          { method: "POST", body: formData }
        );
        const data = await res.json();
        imageUrl = data.data.url;
      }

      // Upload audio if recorded
      if (audioChunks.length) {
        const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
        const audioStorageRef = storageRef(
          storage,
          `chatAudio/${user.uid}_${Date.now()}.webm`
        );
        await new Promise((resolve, reject) => {
          const uploadTask = uploadBytesResumable(audioStorageRef, audioBlob);
          uploadTask.on(
            "state_changed",
            null,
            (error) => reject(error),
            () => resolve()
          );
        });
        audioUrl = await getDownloadURL(audioStorageRef);
      }

      // Build message object
      const msgObj = {
        uid: user.uid,
        name: profile?.name || "User",
        profileImage: profile?.image || null,
        time: Date.now(),
        status: "sent",
      };

      if (audioUrl) {
        msgObj.type = "audio";
        msgObj.audioUrl = audioUrl;
        msgObj.text = message.trim() || "";
      } else if (imageUrl) {
        msgObj.type = "image";
        msgObj.imageUrl = imageUrl;
        msgObj.text = message.trim() || "";
      } else {
        msgObj.type = "text";
        msgObj.text = message.trim();
      }

      await push(dbRef(db, "messages"), msgObj);

      // Clear inputs
      setMessage("");
      setImageFile(null);
      setAudioChunks([]);
    } catch (err) {
      console.error("Send message error:", err);
      alert("Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  // Handle image selection
  const onSelectImage = (e) => {
    if (e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  // Voice recording handlers
  useEffect(() => {
    if (!recording) return;

    let recorder;
    try {
      recorder = new MediaRecorder(new MediaStream());
    } catch {
      // ignore if no mic access or not supported
    }

    if (!recorder) return;

    const chunks = [];
    recorder.ondataavailable = (e) => {
      chunks.push(e.data);
    };

    recorder.onstop = () => {
      setAudioChunks(chunks);
    };

    setMediaRecorder(recorder);

    recorder.start();

    return () => {
      if (recorder && recorder.state !== "inactive") recorder.stop();
    };
  }, [recording]);

  // Start recording
  const startRecording = async () => {
    if (recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      const chunks = [];
      recorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };

      recorder.onstop = () => {
        setAudioChunks(chunks);
        setRecording(false);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
    } catch (err) {
      alert("Microphone access denied.");
    }
  };

  // Cancel recording
  const cancelRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    setAudioChunks([]);
    setRecording(false);
  };

  // Play audio message
  const playAudio = (id) => {
    const audioEl = audioRefs.current[id];
    if (!audioEl) return;
    if (playingAudioId === id) {
      audioEl.pause();
      setPlayingAudioId(null);
    } else {
      // Pause any other playing audio first
      if (playingAudioId && audioRefs.current[playingAudioId]) {
        audioRefs.current[playingAudioId].pause();
      }
      audioEl.play();
      setPlayingAudioId(id);
      audioEl.onended = () => {
        setPlayingAudioId(null);
      };
    }
  };

  // Render typing status text for other users
  const renderTyping = () => {
    const names = Object.values(typingUsers);
    if (names.length === 0) return null;
    if (names.length === 1) return <p>{names[0]} is typing...</p>;
    return <p>{names.join(", ")} are typing...</p>;
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        fontFamily: "Poppins, sans-serif",
        backgroundColor: "#f0f0f0",
      }}
    >
      {/* Header with profile name & online status */}
      <div
        style={{
          padding: "10px",
          backgroundColor: "#00ffcc",
          color: "#000",
          fontWeight: "bold",
          fontSize: "18px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        {profile?.image && (
          <img
            src={profile.image}
            alt="profile"
            style={{ width: 32, height: 32, borderRadius: "50%" }}
          />
        )}
        <span>{profile?.name || "User"}</span>
        <span style={{ marginLeft: "auto", fontWeight: "normal", fontSize: 14 }}>
          {profile?.online ? "🟢 Online" : profile?.lastSeen ? `Last seen: ${timeAgo(profile.lastSeen)}` : "Offline"}
        </span>
      </div>

      {/* Messages list */}
      <div
        style={{
          flex: 1,
          padding: 15,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          backgroundColor: "#fff",
        }}
      >
        {messages.map((msg) => {
          const isOwn = msg.uid === user.uid;
          return (
            <div
              key={msg.id}
              style={{
                alignSelf: isOwn ? "flex-end" : "flex-start",
                maxWidth: "75%",
                backgroundColor: isOwn ? "#dcf8c6" : "#eee",
                borderRadius: 12,
                padding: 10,
                boxShadow: "0 0 5px rgba(0,0,0,0.15)",
                display: "flex",
                flexDirection: "column",
                position: "relative",
              }}
            >
              {/* Sender info */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                {msg.profileImage && (
                  <img
                    src={msg.profileImage}
                    alt={msg.name}
                    style={{ width: 24, height: 24, borderRadius: "50%" }}
                  />
                )}
                <strong>{msg.name}</strong>
              </div>

              {/* Message content */}
              {msg.type === "text" && <div>{msg.text}</div>}

              {msg.type === "image" && (
                <img
                  src={msg.imageUrl}
                  alt="sent pic"
                  style={{ maxWidth: "200px", borderRadius: 8, cursor: "pointer" }}
                  onClick={() => window.open(msg.imageUrl, "_blank")}
                />
              )}

              {msg.type === "audio" && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                  onClick={() => playAudio(msg.id)}
                >
                  <button
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      border: "1px solid #00cc99",
                      backgroundColor: playingAudioId === msg.id ? "#00cc99" : "transparent",
                      color: playingAudioId === msg.id ? "#fff" : "#00cc99",
                      fontWeight: "bold",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    {playingAudioId === msg.id ? "
