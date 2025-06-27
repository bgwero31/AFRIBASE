// ✅ Profile.js — updated for linking to private Inbox
import React, { useEffect, useState, useRef } from "react";
import {
  getAuth,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
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
import { useNavigate } from "react-router-dom";

const auth = getAuth();
const imgbbKey = "30df4aa05f1af3b3b58ee8a74639e5cf";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [profileData, setProfileData] = useState({});
  const [inbox, setInbox] = useState([]);
  const [userMap, setUserMap] = useState({});
  const [uploading, setUploading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const inboxRef = useRef();
  const audio = useRef(null);

  useEffect(() => {
    audio.current = new Audio("/notify.mp3");
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const userSnap = await get(child(ref(db), `users/${u.uid}`));
        if (userSnap.exists()) setProfileData(userSnap.val());

        const usersSnap = await get(ref(db, `users`));
        const map = {};
        if (usersSnap.exists()) {
          Object.entries(usersSnap.val()).forEach(([id, d]) => {
            map[id] = d.name || "User";
          });
        }
        setUserMap(map);

        inboxRef.current = ref(db, `inbox/${u.uid}`);
        let firstLoad = true;
        onValue(inboxRef.current, (snap) => {
          if (snap.exists()) {
            const messages = Object.entries(snap.val())
              .map(([id, m]) => ({ id, ...m }))
              .filter((m) => m.message && m.fromId);
            if (!firstLoad && messages.length > inbox.length) {
              audio.current?.play().catch(() => {});
            }
            firstLoad = false;
            setInbox(messages.sort((a, b) => b.timestamp - a.timestamp));
            setUnreadCount(messages.filter((m) => !m.read).length);
          } else {
            setInbox([]);
            setUnreadCount(0);
          }
        });
      }
    });
    return () => unsub();
  }, []);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("image", file);
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    const url = data.data.url;
    await update(ref(db, `users/${user.uid}`), { image: url });
    setProfileData((prev) => ({ ...prev, image: url }));
    setUploading(false);
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

  const goToInbox = (fromId) => {
    navigate(`/inbox/${fromId}`);
  };

  if (!user) return <p style={{ padding: 20 }}>Checking...</p>;

  return (
    <div style={{ padding: 20, fontFamily: "Poppins" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <h2>👤 Profile</h2>
        {profileData.image ? (
          <img src={profileData.image} alt="profile" style={{ width: 100, height: 100, borderRadius: "50%" }} />
        ) : <div style={{ fontSize: 40 }}>🙍</div>}
        <h3>{profileData.name}</h3>
        <p>{profileData.email}</p>
        <button onClick={handleLogout}>🚪 Logout</button>
      </div>

      <h3>📥 Inbox ({unreadCount} new)</h3>
      <div style={{ maxHeight: 200, overflowY: "auto" }}>
        {inbox.length ? inbox.map((msg) => (
          <div key={msg.id} onClick={() => goToInbox(msg.fromId)} style={{
            padding: 8,
            marginBottom: 6,
            background: msg.read ? "#eee" : "#cce5ff",
            borderRadius: 8,
            cursor: "pointer"
          }}>
            <strong>{userMap[msg.fromId]}</strong>: {msg.message.slice(0, 40)}...
            <div style={{ fontSize: 12 }}>{timeAgo(msg.timestamp)}</div>
          </div>
        )) : <p>No messages</p>}
      </div>
    </div>
  );
}
