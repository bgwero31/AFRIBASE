// src/pages/Profile.js

import React, { useEffect, useState } from "react";
import {
  getAuth,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { ref, get, child, update, onValue } from "firebase/database";
import { db } from "../firebase";

const auth = getAuth();
const imgbbKey = "30df4aa05f1af3b3b58ee8a74639e5cf";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [profileData, setProfileData] = useState({});
  const [uploading, setUploading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [postedImages, setPostedImages] = useState([]);
  const [inboxMessages, setInboxMessages] = useState([]);
  const [outboxMessages, setOutboxMessages] = useState([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);

        const userSnap = await get(child(ref(db), `users/${u.uid}`));
        if (userSnap.exists()) setProfileData(userSnap.val());

        const productsSnap = await get(child(ref(db), `products`));
        const userPosts = [];
        if (productsSnap.exists()) {
          Object.values(productsSnap.val()).forEach(p => {
            if (p.uid === u.uid && p.image) userPosts.push(p.image);
          });
        }
        setPostedImages(userPosts);

        const inboxRef = ref(db, `inbox/${u.uid}`);
        onValue(inboxRef, (snap) => {
          if (snap.exists()) {
            const msgs = Object.values(snap.val());
            setInboxMessages(msgs.sort((a, b) => b.time - a.time));
          } else {
            setInboxMessages([]);
          }
        });

        const outRef = ref(db, "inbox");
        onValue(outRef, (snap) => {
          const outbox = [];
          if (snap.exists()) {
            Object.values(snap.val()).forEach(list => {
              Object.values(list).forEach(msg => {
                if (msg.from === u.uid) {
                  outbox.push(msg);
                }
              });
            });
          }
          setOutboxMessages(outbox.sort((a, b) => b.time - a.time));
        });
      } else {
        setUser(null);
      }
    });
    return () => {};
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

  if (!user) return null;

  return (
    <div style={container}>
      <div style={hamburger} onClick={() => setMenuOpen(!menuOpen)}>☰</div>

      {menuOpen && (
        <div style={menu}>
          <p style={menuItem}>📥 Inbox ({inboxMessages.length})</p>
          <p style={menuItem}>📤 Outbox ({outboxMessages.length})</p>
          <p onClick={() => alert("Preferences soon")} style={menuItem}>⚙️ Preferences</p>
          <p onClick={() => alert("Theme soon")} style={menuItem}>🌓 Theme</p>
          <p onClick={handleLogout} style={{ ...menuItem, color: "#f44336" }}>🚪 Logout</p>
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
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          id="fileInput"
          style={{ display: "none" }}
        />
        {uploading && <p>Uploading...</p>}
        <h2 style={name}>{profileData.name}</h2>
        <p style={tagline}>{profileData.email}</p>
        <button style={button} onClick={handleNameChange}>✏️ Edit Name</button>

        <h3 style={{ marginTop: 30 }}>📸 Your Posts</h3>
        <div style={gallery}>
          {postedImages.length ? (
            postedImages.map((img, i) => (
              <img key={i} src={img} alt="Post" style={postImg} />
            ))
          ) : (
            <p>No posts yet.</p>
          )}
        </div>

        <h3 style={{ marginTop: 30 }}>📨 Inbox</h3>
        <div style={messageBox}>
          {inboxMessages.length ? inboxMessages.map((msg, i) => (
            <div key={i} style={msgCard}>
              <strong>{msg.name}</strong>
              <p>{msg.text}</p>
              <small>{new Date(msg.time).toLocaleString()}</small>
            </div>
          )) : <p>No inbox messages.</p>}
        </div>

        <h3 style={{ marginTop: 30 }}>📤 Outbox</h3>
        <div style={messageBox}>
          {outboxMessages.length ? outboxMessages.map((msg, i) => (
            <div key={i} style={msgCard}>
              <strong>To: {msg.toName || "Unknown"}</strong>
              <p>{msg.text}</p>
              <small>{new Date(msg.time).toLocaleString()}</small>
            </div>
          )) : <p>No sent messages.</p>}
        </div>
      </div>
    </div>
  );
}

// Styles
const container = {
  position: "relative",
  padding: 20,
  background: "#f5f5f5",
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const hamburger = {
  position: "absolute",
  top: 20,
  left: 20,
  fontSize: 26,
  cursor: "pointer",
  zIndex: 2,
};

const menu = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "70%",
  height: "100vh",
  background: "#fff",
  boxShadow: "4px 0 12px rgba(0,0,0,0.1)",
  padding: 20,
  zIndex: 3,
};

const menuItem = {
  fontSize: "18px",
  margin: "20px 0",
  cursor: "pointer",
};

const card = {
  background: "#fff",
  borderRadius: "20px",
  padding: "30px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  textAlign: "center",
  maxWidth: "350px",
  width: "100%",
};

const avatar = {
  width: "100px",
  height: "100px",
  borderRadius: "50%",
  background: "#ddd",
  margin: "0 auto 20px",
  overflow: "hidden",
  cursor: "pointer"
};

const name = {
  fontSize: "24px",
  fontWeight: "700",
  margin: "10px 0 5px"
};

const tagline = {
  fontSize: "14px",
  color: "#777",
  marginBottom: "15px"
};

const button = {
  background: "#00cc88",
  color: "#fff",
  padding: "10px 20px",
  border: "none",
  borderRadius: "10px",
  fontWeight: "600",
  cursor: "pointer",
  marginTop: "10px"
};

const gallery = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  justifyContent: "center",
  marginTop: "10px",
};

const postImg = {
  width: "100px",
  height: "100px",
  objectFit: "cover",
  borderRadius: "10px",
};

const messageBox = {
  maxHeight: "200px",
  overflowY: "auto",
  textAlign: "left",
};

const msgCard = {
  background: "#f0f0f0",
  padding: "10px",
  borderRadius: "10px",
  marginBottom: "10px",
};
