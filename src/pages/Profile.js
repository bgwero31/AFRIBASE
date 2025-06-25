import React, { useEffect, useState } from "react";
import { getAuth, signOut, onAuthStateChanged } from "firebase/auth";
import {
  ref,
  get,
  child,
  update,
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
  const [reply, setReply] = useState("");
  const [selectedMsg, setSelectedMsg] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        window.location.href = "/login";
        return;
      }

      setUser(u);
      const snap = await get(child(ref(db), `users/${u.uid}`));
      if (snap.exists()) setProfileData(snap.val());

      const usersSnap = await get(ref(db, "users"));
      const map = {};
      if (usersSnap.exists()) {
        Object.entries(usersSnap.val()).forEach(([id, d]) => {
          map[id] = d.name || "Unknown";
        });
      }
      setUserMap(map);

      const inboxRef = ref(db, `inbox/${u.uid}`);
      onValue(inboxRef, (snap) => {
        if (snap.exists()) {
          const msgs = Object.entries(snap.val()).map(([id, m]) => ({ id, ...m }));
          setInbox(msgs);
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
      setLoading(false);
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
    window.location.href = "/login";
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

  if (loading) return <p style={{ textAlign: "center", marginTop: "100px" }}>Checking login...</p>;

  return (
    <div
      style={{
        backgroundImage: "url('/assets/IMG-20250620-WA0007.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        minHeight: "100vh",
        padding: 20,
      }}
    >
      {/* Hamburger */}
      <div onClick={() => setMenuOpen(!menuOpen)} style={{ fontSize: 26, cursor: "pointer" }}>
        ☰
      </div>

      {menuOpen && (
        <div style={{ background: "#fff", padding: 15, borderRadius: 10, marginTop: 10 }}>
          <p onClick={() => alert("Preferences soon")}>⚙️ Preferences</p>
          <p style={{ color: "red" }} onClick={handleLogout}>
            🚪 Logout
          </p>
        </div>
      )}

      {/* Profile Card */}
      <div
        style={{
          background: "#fff",
          padding: 20,
          borderRadius: 10,
          maxWidth: 400,
          margin: "30px auto",
          textAlign: "center",
        }}
      >
        <div onClick={() => document.getElementById("fileInput").click()} style={{ cursor: "pointer" }}>
          {profileData.image ? (
            <img
              src={profileData.image}
              alt="profile"
              style={{ width: 100, height: 100, borderRadius: "50%" }}
            />
          ) : (
            <p style={{ fontSize: 30 }}>👤</p>
          )}
        </div>
        <input id="fileInput" type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
        <h2>{profileData.name}</h2>
        <p>{profileData.email}</p>
        {uploading && <p>Uploading...</p>}
        <button onClick={handleNameChange}>✏️ Edit Name</button>

        {/* Inbox */}
        <h3>📥 Inbox</h3>
        {inbox.length ? (
          inbox.map((m) => (
            <p
              key={m.id}
              style={{ textAlign: "left", cursor: "pointer" }}
              onClick={() => markAsRead(m)}
            >
              <strong>{m.fromName}</strong>: {m.message.slice(0, 25)}...
            </p>
          ))
        ) : (
          <p>No messages</p>
        )}

        {/* Outbox */}
        <h3>📤 Outbox</h3>
        {outbox.length ? (
          outbox.map((m, i) => (
            <p key={i} style={{ textAlign: "left" }}>
              To <strong>{userMap[m.to]}</strong>: {m.message.slice(0, 25)}...
            </p>
          ))
        ) : (
          <p>No sent messages</p>
        )}
      </div>

      {/* Message Modal */}
      {selectedMsg && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 100,
          }}
          onClick={() => setSelectedMsg(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              padding: 20,
              borderRadius: 10,
              maxWidth: 400,
              width: "90%",
              textAlign: "center",
            }}
          >
            <h3>📨 Message</h3>
            <p><strong>From:</strong> {selectedMsg.fromName}</p>
            <p>{selectedMsg.message}</p>
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Reply..."
              style={{ width: "90%", padding: 8, borderRadius: 6 }}
            />
            <button onClick={sendReply}>Send</button>
            <button onClick={() => setSelectedMsg(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
