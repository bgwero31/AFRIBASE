import React, { useEffect, useState, useRef } from "react";
import {
  getAuth,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { ref, get, child, update, remove, push, onValue } from "firebase/database";
import { db } from "../firebase";

const auth = getAuth();
const imgbbKey = "30df4aa05f1af3b3b58ee8a74639e5cf";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [profileData, setProfileData] = useState({});
  const [uploading, setUploading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [postedImages, setPostedImages] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [selectedMsg, setSelectedMsg] = useState(null);
  const [reply, setReply] = useState("");
  const [outbox, setOutbox] = useState([]);
  const [userMap, setUserMap] = useState({});
  const inboxRef = useRef();

  // Audio element
  const audio = useRef(null);

  useEffect(() => {
    audio.current = new Audio("/notify.mp3"); // Place this file in public/
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const userSnap = await get(child(ref(db), `users/${u.uid}`));
        if (userSnap.exists()) setProfileData(userSnap.val());

        // All users map
        const allUsersSnap = await get(ref(db, `users`));
        if (allUsersSnap.exists()) {
          const map = {};
          Object.entries(allUsersSnap.val()).forEach(([id, data]) => {
            map[id] = data.name || "Unknown";
          });
          setUserMap(map);
        }

        // Load own posts
        const productSnap = await get(child(ref(db), `products`));
        const posts = [];
        if (productSnap.exists()) {
          Object.values(productSnap.val()).forEach((p) => {
            if (p.uid === u.uid && p.image) posts.push(p.image);
          });
        }
        setPostedImages(posts);

        // Realtime inbox with sound
        inboxRef.current = ref(db, `inbox/${u.uid}`);
        let firstLoad = true;
        onValue(inboxRef.current, (snap) => {
          if (snap.exists()) {
            const msgs = Object.entries(snap.val()).map(([id, m]) => ({ id, ...m }));
            msgs.sort((a, b) => b.timestamp - a.timestamp);
            if (!firstLoad && msgs.length > inbox.length && audio.current) {
              audio.current.play().catch(() => {}); // Play sound on new
            }
            firstLoad = false;
            setInbox(msgs);
          }
        });

        // Load outbox from all inboxes
        const allInboxSnap = await get(ref(db, `inbox`));
        const outMsgs = [];
        if (allInboxSnap.exists()) {
          Object.entries(allInboxSnap.val()).forEach(([receiverId, msgs]) => {
            Object.entries(msgs).forEach(([msgId, msg]) => {
              if (msg.fromId === u.uid) {
                outMsgs.push({ ...msg, id: msgId, to: receiverId });
              }
            });
          });
          outMsgs.sort((a, b) => b.timestamp - a.timestamp);
          setOutbox(outMsgs);
        }
      } else {
        setUser(null);
      }
    });

    return () => unsub();
  }, []);

  const timeAgo = (timestamp) => {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

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
    const imageUrl = data.data.url;
    await update(ref(db, `users/${user.uid}`), { image: imageUrl });
    setProfileData((prev) => ({ ...prev, image: imageUrl }));
    setUploading(false);
  };

  const handleNameChange = async () => {
    const newName = prompt("Enter your name:");
    if (newName && user) {
      await update(ref(db, `users/${user.uid}`), { name: newName });
      setProfileData((prev) => ({ ...prev, name: newName }));
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = "/";
  };

  const sendReply = async () => {
    if (!reply || !selectedMsg || !user) return;
    const toId = selectedMsg.fromId;
    const replyData = {
      fromId: user.uid,
      fromName: profileData.name,
      message: reply,
      timestamp: Date.now(),
    };
    await push(ref(db, `inbox/${toId}`), replyData);
    setReply("");
    setSelectedMsg(null);
    alert("Reply sent!");
  };

  const deleteMessage = async () => {
    if (!user || !selectedMsg) return;
    await remove(ref(db, `inbox/${user.uid}/${selectedMsg.id}`));
    setInbox(inbox.filter((m) => m.id !== selectedMsg.id));
    setSelectedMsg(null);
  };

  const reactToMessage = async () => {
    if (!selectedMsg || !user) return;
    await update(ref(db, `inbox/${user.uid}/${selectedMsg.id}`), {
      reaction: "❤️",
    });
    setSelectedMsg((prev) => ({ ...prev, reaction: "❤️" }));
  };

  if (!user) return null;

  return (
    <div style={container}>
      <div style={hamburger} onClick={() => setMenuOpen(!menuOpen)}>☰</div>

      {menuOpen && (
        <div style={menu}>
          <p style={menuTitle}>📥 Inbox</p>
          {inbox.length ? inbox.map((msg) => (
            <p key={msg.id} onClick={() => setSelectedMsg(msg)} style={menuItem}>
              <strong>{msg.fromName}</strong>: {msg.message.slice(0, 25)}... ({timeAgo(msg.timestamp)})
            </p>
          )) : <p style={menuItem}>No inbox messages</p>}
          <hr />
          <p style={menuTitle}>📤 Outbox</p>
          {outbox.length ? outbox.map((msg, i) => (
            <p key={i} style={{ ...menuItem, color: "#444" }}>
              To <strong>{userMap[msg.to] || msg.to}</strong>: {msg.message.slice(0, 25)}... ({timeAgo(msg.timestamp)})
            </p>
          )) : <p style={menuItem}>No sent messages</p>}
          <hr />
          <p onClick={() => alert("Preferences coming soon")} style={menuItem}>⚙️ Preferences</p>
          <p onClick={() => alert("Theme toggle coming soon")} style={menuItem}>🌓 Theme</p>
          <p onClick={handleLogout} style={{ ...menuItem, color: "#f44336" }}>🚪 Logout</p>
        </div>
      )}

      {selectedMsg && (
        <div style={modalOverlay} onClick={() => setSelectedMsg(null)}>
          <div style={modal} onClick={(e) => e.stopPropagation()}>
            <h3>📨 Message</h3>
            <p><strong>From:</strong> {selectedMsg.fromName}</p>
            <p><strong>Time:</strong> {timeAgo(selectedMsg.timestamp)}</p>
            <p><strong>Message:</strong> {selectedMsg.message}</p>
            {selectedMsg.reaction && <p>❤️ Reacted</p>}
            <input
              type="text"
              placeholder="Type a reply..."
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              style={input}
            />
            <div style={{ marginTop: 10 }}>
              <button style={button} onClick={sendReply}>Send Reply</button>
              <button style={{ ...button, background: "#e91e63" }} onClick={reactToMessage}>❤️ React</button>
              <button style={{ ...button, background: "#f44336" }} onClick={deleteMessage}>Delete</button>
            </div>
            <button style={{ marginTop: 10 }} onClick={() => setSelectedMsg(null)}>Close</button>
          </div>
        </div>
      )}

      <div style={card}>
        <div style={avatar} onClick={() => document.getElementById("fileInput").click()}>
          {profileData.image ? (
            <img src={profileData.image} alt="Profile" style={{ width: "100%", height: "100%", borderRadius: "50%" }} />
          ) : (
            <p style={{ fontSize: 30, marginTop: 28 }}>👤</p>
          )}
        </div>
        <input type="file" accept="image/*" onChange={handleImageUpload} id="fileInput" style={{ display: "none" }} />
        {uploading && <p>Uploading...</p>}
        <h2 style={name}>{profileData.name}</h2>
        <p style={tagline}>{profileData.email}</p>
        <button style={button} onClick={handleNameChange}>✏️ Edit Name</button>

        <div style={stats}>
          <div><strong>{profileData.posts || 0}</strong><p>Posts</p></div>
          <div><strong>{profileData.likes || 0}</strong><p>Likes</p></div>
          <div><strong>{profileData.comments || 0}</strong><p>Comments</p></div>
        </div>

        <h3 style={{ marginTop: 30 }}>📸 Your Posts</h3>
        <div style={gallery}>
          {postedImages.length ? postedImages.map((img, i) => (
            <img key={i} src={img} alt="Post" style={postImg} />
          )) : <p>No posts yet.</p>}
        </div>
      </div>
    </div>
  );
}

// Same styles as before...
const container = {
  position: "relative",
  padding: 20,
  background: "#f5f5f5",
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};
const hamburger = { position: "absolute", top: 20, left: 20, fontSize: 26, cursor: "pointer", zIndex: 10 };
const menu = {
  position: "absolute", top: 0, left: 0, width: "80%", height: "100vh",
  background: "#fff", boxShadow: "4px 0 12px rgba(0,0,0,0.1)", padding: 20, zIndex: 9, overflowY: "auto"
};
const menuTitle = { fontSize: "20px", fontWeight: "bold", margin: "10px 0" };
const menuItem = { fontSize: "15px", margin: "8px 0", cursor: "pointer", padding: "6px", borderBottom: "1px solid #eee" };
const modalOverlay = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 20 };
const modal = { background: "#fff", padding: "20px", borderRadius: "10px", width: "85%", maxWidth: "400px", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" };
const card = { background: "#fff", borderRadius: "20px", padding: "30px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", textAlign: "center", maxWidth: "350px", width: "100%" };
const avatar = { width: "100px", height: "100px", borderRadius: "50%", background: "#ddd", margin: "0 auto 20px", overflow: "hidden", cursor: "pointer" };
const name = { fontSize: "24px", fontWeight: "700", margin: "10px 0 5px" };
const tagline = { fontSize: "14px", color: "#777", marginBottom: "15px" };
const button = { background: "#00cc88", color: "#fff", padding: "10px 20px", border: "none", borderRadius: "10px", fontWeight: "600", cursor: "pointer", margin: "5px" };
const input = { width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc", marginTop: "10px" };
const stats = { display: "flex", justifyContent: "space-around", marginBottom: "20px", fontSize: "14px", color: "#555" };
const gallery = { display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center", marginTop: "10px" };
const postImg = { width: "100px", height: "100px", objectFit: "cover", borderRadius: "10px" };
