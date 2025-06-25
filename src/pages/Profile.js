import React, { useEffect, useState, useRef } from "react";
import { getAuth, signOut, onAuthStateChanged } from "firebase/auth";
import {
  ref,
  get,
  child,
  update,
  remove,
  push,
  onValue,
} from "firebase/database";
import { db } from "../firebase";

const auth = getAuth();
const imgbbKey = "30df4aa05f1af3b3b58ee8a74639e5cf";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [profileData, setProfileData] = useState({});
  const [uploading, setUploading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [inbox, setInbox] = useState([]);
  const [outbox, setOutbox] = useState([]);
  const [userMap, setUserMap] = useState({});
  const [unreadCount, setUnreadCount] = useState(0);
  const [reply, setReply] = useState("");
  const [selectedMsg, setSelectedMsg] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const snap = await get(child(ref(db), `users/${u.uid}`));
        if (snap.exists()) setProfileData(snap.val());

        const allUsers = await get(ref(db, "users"));
        const map = {};
        if (allUsers.exists()) {
          Object.entries(allUsers.val()).forEach(([id, d]) => {
            map[id] = d.name || "Unknown";
          });
        }
        setUserMap(map);

        const inboxRef = ref(db, `inbox/${u.uid}`);
        onValue(inboxRef, (snap) => {
          if (snap.exists()) {
            const msgs = Object.entries(snap.val()).map(([id, m]) => ({ id, ...m }));
            setInbox(msgs);
            setUnreadCount(msgs.filter((m) => !m.read).length);
          }
        });

        const allInbox = await get(ref(db, "inbox"));
        const sent = [];
        if (allInbox.exists()) {
          Object.entries(allInbox.val()).forEach(([toId, msgs]) => {
            Object.entries(msgs).forEach(([msgId, msg]) => {
              if (msg.fromId === u.uid) sent.push({ ...msg, to: toId });
            });
          });
        }
        setOutbox(sent);
      } else {
        setUser(null);
      }
    });

    return () => unsub();
  }, []);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;
    setUploading(true);
    const form = new FormData();
    form.append("image", file);
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, {
      method: "POST",
      body: form,
    });
    const data = await res.json();
    const url = data.data.url;
    await update(ref(db, `users/${user.uid}`), { image: url });
    setProfileData((prev) => ({ ...prev, image: url }));
    setUploading(false);
  };

  const handleNameChange = async () => {
    const name = prompt("New name:");
    if (!name || !user) return;
    await update(ref(db, `users/${user.uid}`), { name });
    setProfileData((prev) => ({ ...prev, name }));
  };

  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = "/";
  };

  const sendReply = async () => {
    if (!reply || !selectedMsg || !user) return;
    const replyData = {
      fromId: user.uid,
      fromName: profileData.name,
      message: reply,
      timestamp: Date.now(),
    };
    await push(ref(db, `inbox/${selectedMsg.fromId}`), replyData);
    setReply("");
    setSelectedMsg(null);
  };

  const markAsRead = async (msg) => {
    await update(ref(db, `inbox/${user.uid}/${msg.id}`), { read: true });
    setSelectedMsg(msg);
  };

  if (!user) return null;

  return (
    <div style={{
      backgroundImage: "url('/assets/IMG-20250620-WA0007.jpg')",
      backgroundSize: "cover",
      minHeight: "100vh",
      padding: 20,
      color: "#000"
    }}>
      <div onClick={() => setMenuOpen(!menuOpen)} style={{ fontSize: 28, cursor: "pointer" }}>☰</div>

      {menuOpen && (
        <div style={{ background: "#fff", padding: 10, borderRadius: 10, marginBottom: 20 }}>
          <p onClick={() => alert("Settings soon")}>⚙️ Preferences</p>
          <p onClick={() => alert("Theme coming")}>🌓 Toggle Theme</p>
          <p style={{ color: "red" }} onClick={handleLogout}>🚪 Logout</p>
        </div>
      )}

      <div style={{
        textAlign: "center",
        background: "#fff",
        borderRadius: 20,
        padding: 20,
        maxWidth: 400,
        margin: "auto"
      }}>
        <div onClick={() => document.getElementById("fileInput").click()} style={{ cursor: "pointer" }}>
          {profileData.image ? (
            <img src={profileData.image} alt="pfp" style={{ width: 100, height: 100, borderRadius: "50%" }} />
          ) : <p>👤</p>}
        </div>
        <input id="fileInput" type="file" style={{ display: "none" }} onChange={handleImageUpload} />
        <h2>{profileData.name}</h2>
        <p>{profileData.email}</p>
        {uploading && <p>Uploading...</p>}
        <button onClick={handleNameChange}>✏️ Edit Name</button>

        <h3>📥 Inbox ({unreadCount})</h3>
        <div>
          {inbox.map((m) => (
            <p key={m.id} onClick={() => markAsRead(m)}>
              <strong>{m.fromName}</strong>: {m.message.slice(0, 20)}...
            </p>
          ))}
        </div>

        <h3>📤 Outbox</h3>
        <div>
          {outbox.map((m, i) => (
            <p key={i}>
              To <strong>{userMap[m.to]}</strong>: {m.message.slice(0, 20)}...
            </p>
          ))}
        </div>
      </div>

      {selectedMsg && (
        <div style={{
          background: "#fff",
          padding: 20,
          borderRadius: 10,
          marginTop: 20
        }}>
          <p><strong>From:</strong> {selectedMsg.fromName}</p>
          <p>{selectedMsg.message}</p>
          <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply..." />
          <button onClick={sendReply}>Send</button>
          <button onClick={() => setSelectedMsg(null)}>Close</button>
        </div>
      )}
    </div>
  );
}
