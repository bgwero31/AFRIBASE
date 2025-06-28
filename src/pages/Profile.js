import React, { useEffect, useState, useRef } from "react";
import { getAuth, signOut, onAuthStateChanged } from "firebase/auth";
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
  const [inboxList, setInboxList] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [userMap, setUserMap] = useState({});
  const audio = useRef(null);

  useEffect(() => {
    audio.current = new Audio("/notify.mp3");
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) return setUser(null);
      setUser(u);

      const userSnap = await get(child(ref(db), `users/${u.uid}`));
      if (userSnap.exists()) setProfileData(userSnap.val());

      // Get all user names
      const allUsersSnap = await get(ref(db, `users`));
      const map = {};
      if (allUsersSnap.exists()) {
        Object.entries(allUsersSnap.val()).forEach(([id, d]) => {
          map[id] = d.name || "Unknown";
        });
      }
      setUserMap(map);

      // Get user posts
      const productsRef = ref(db, "products");
      onValue(productsRef, (snap) => {
        const posts = [];
        if (snap.exists()) {
          Object.entries(snap.val()).forEach(([id, p]) => {
            if (p.uid === u.uid && p.image) posts.push({ ...p, id });
          });
        }
        setPostedImages(posts);
      });

      // Fetch chat inbox list (unique users who sent messages)
      const inboxRef = ref(db, `inbox/${u.uid}`);
      onValue(inboxRef, (snap) => {
        const userMap = {};
        if (snap.exists()) {
          Object.entries(snap.val()).forEach(([msgId, msg]) => {
            if (msg.fromId && msg.message) {
              userMap[msg.fromId] = msg.fromName;
            }
          });
        }
        const list = Object.entries(userMap).map(([uid, name]) => ({
          uid,
          name,
        }));
        setInboxList(list);
      });
    });

    return () => unsub();
  }, []);

  const loadChatWithUser = (uid) => {
    setSelectedUserId(uid);
    const chatRef = ref(db, `inbox/${user.uid}`);
    onValue(chatRef, (snap) => {
      const chat = [];
      if (snap.exists()) {
        Object.entries(snap.val()).forEach(([id, m]) => {
          if (m.fromId === uid || m.toId === uid) {
            chat.push({ ...m, id });
          }
        });
        chat.sort((a, b) => a.timestamp - b.timestamp);
      }
      setMessages(chat);
    });
  };

  const sendReply = async () => {
    if (!reply || !user || !selectedUserId) return;
    const msg = {
      fromId: user.uid,
      fromName: profileData.name,
      toId: selectedUserId,
      message: reply,
      timestamp: Date.now(),
      read: false,
    };
    await push(ref(db, `inbox/${selectedUserId}`), msg);
    await push(ref(db, `inbox/${user.uid}`), msg);
    setReply("");
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
    const url = data.data.url;
    await update(ref(db, `users/${user.uid}`), { image: url });
    setProfileData((prev) => ({ ...prev, image: url }));
    setUploading(false);
  };

  const handleNameChange = async () => {
    const name = prompt("Enter new name:");
    if (!name || !user) return;
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

  if (!user) return <p style={{ padding: 20 }}>Checking...</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Welcome, {profileData.name}</h2>
      <button onClick={handleLogout}>Logout</button>
      <br />
      <input type="file" onChange={handleImageUpload} />
      {uploading && <p>Uploading...</p>}
      <button onClick={handleNameChange}>Edit Name</button>

      <h3>Inbox</h3>
      {inboxList.map((item) => (
        <p key={item.uid} style={{ cursor: "pointer", color: "blue" }} onClick={() => loadChatWithUser(item.uid)}>
          📩 {item.name}
        </p>
      ))}

      {selectedUserId && (
        <div style={{ borderTop: "1px solid #ccc", marginTop: 20 }}>
          <h4>Chat with {userMap[selectedUserId]}</h4>
          <div style={{ maxHeight: 300, overflowY: "auto" }}>
            {messages.map((m, i) => (
              <div key={i} style={{ marginBottom: 10, textAlign: m.fromId === user.uid ? "right" : "left" }}>
                <div
                  style={{
                    display: "inline-block",
                    background: m.fromId === user.uid ? "#d1ffd6" : "#f0f0f0",
                    padding: "8px 12px",
                    borderRadius: 10,
                  }}
                >
                  {m.message}
                  <br />
                  <small>{timeAgo(m.timestamp)}</small>
                </div>
              </div>
            ))}
          </div>
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Type message..."
            style={{ width: "80%", padding: 8, marginTop: 10 }}
          />
          <button onClick={sendReply} style={{ padding: 8 }}>Send</button>
        </div>
      )}
    </div>
  );
}
