import React, { useEffect, useState, useRef } from "react";
import { getAuth, signOut, onAuthStateChanged } from "firebase/auth";
import { ref, get, child, update, push, onValue } from "firebase/database";
import { db } from "../firebase";

export default function Profile() {
  const auth = getAuth();
  const [user, setUser] = useState(null);
  const [profileData, setProfileData] = useState({});
  const [uploading, setUploading] = useState(false);
  const [inboxUsers, setInboxUsers] = useState([]); // Unique users you chat with
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [userMap, setUserMap] = useState({});

  // 🔊 Optional audio
  const audio = useRef(null);
  useEffect(() => {
    audio.current = new Audio("/notify.mp3");
  }, []);

  // Auth & load data
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) return setUser(null);
      setUser(u);

      // Get profile
      const snap = await get(child(ref(db), `users/${u.uid}`));
      if (snap.exists()) setProfileData(snap.val());

      // Get all users map
      const usersSnap = await get(ref(db, "users"));
      const map = {};
      if (usersSnap.exists()) {
        Object.entries(usersSnap.val()).forEach(([id, d]) => {
          map[id] = d.name || "Unknown";
        });
      }
      setUserMap(map);

      // Listen for inbox list
      const inboxRef = ref(db, `inbox/${u.uid}`);
      onValue(inboxRef, (snap) => {
        const userSet = {};
        if (snap.exists()) {
          Object.entries(snap.val()).forEach(([msgId, msg]) => {
            if (msg.fromId && msg.message) {
              const otherId = msg.fromId === u.uid ? msg.toId : msg.fromId;
              userSet[otherId] = userMap[otherId] || "Unknown";
            }
          });
        }
        const list = Object.entries(userSet).map(([uid, name]) => ({ uid, name }));
        setInboxUsers(list);
      });
    });
    return () => unsub();
  }, []);

  // Load chat with selected user
  const loadChatWithUser = (uid) => {
    setSelectedUserId(uid);
    const inboxRef = ref(db, `inbox/${user.uid}`);
    onValue(inboxRef, (snap) => {
      const msgs = [];
      if (snap.exists()) {
        Object.entries(snap.val()).forEach(([id, msg]) => {
          if (msg.fromId === uid || msg.toId === uid) {
            msgs.push({ ...msg, id });
          }
        });
        msgs.sort((a, b) => a.timestamp - b.timestamp);
      }
      setMessages(msgs);
    });
  };

  // Send reply
  const sendReply = async () => {
    if (!reply || !selectedUserId) return;
    const msg = {
      fromId: user.uid,
      toId: selectedUserId,
      fromName: profileData.name || "Me",
      message: reply,
      timestamp: Date.now(),
      read: false,
    };
    await push(ref(db, `inbox/${user.uid}`), msg);
    await push(ref(db, `inbox/${selectedUserId}`), msg);
    setReply("");
  };

  // Image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("image", file);
    const res = await fetch(`https://api.imgbb.com/1/upload?key=30df4aa05f1af3b3b58ee8a74639e5cf`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    const url = data.data.url;
    await update(ref(db, `users/${user.uid}`), { image: url });
    setProfileData((prev) => ({ ...prev, image: url }));
    setUploading(false);
  };

  const handleNameChange = async () => {
    const name = prompt("Enter new name:");
    if (!name) return;
    await update(ref(db, `users/${user.uid}`), { name });
    setProfileData((prev) => ({ ...prev, name }));
  };

  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = "/";
  };

  const timeAgo = (ts) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  if (!user) return <p>Checking...</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>{profileData.name}</h2>
      <input type="file" onChange={handleImageUpload} />
      {uploading && <p>Uploading...</p>}
      <button onClick={handleNameChange}>Edit Name</button>
      <button onClick={handleLogout}>Logout</button>

      <h3>Inbox</h3>
      {inboxUsers.map((u) => (
        <p key={u.uid} onClick={() => loadChatWithUser(u.uid)} style={{ cursor: "pointer" }}>
          📩 {u.name}
        </p>
      ))}

      {selectedUserId && (
        <div>
          <h4>Chat with {userMap[selectedUserId]}</h4>
          <div style={{ maxHeight: 200, overflowY: "auto" }}>
            {messages.map((m, i) => (
              <div key={i} style={{ textAlign: m.fromId === user.uid ? "right" : "left" }}>
                <span>{m.message}</span>
                <small> {timeAgo(m.timestamp)}</small>
              </div>
            ))}
          </div>
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Type message..."
          />
          <button onClick={sendReply}>Send</button>
        </div>
      )}
    </div>
  );
}
