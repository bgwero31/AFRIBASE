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

const auth = getAuth();
const imgbbKey = "30df4aa05f1af3b3b58ee8a74639e5cf";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [profileData, setProfileData] = useState({});
  const [uploading, setUploading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [postedImages, setPostedImages] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedMsg, setSelectedMsg] = useState(null);
  const [reply, setReply] = useState("");
  const [outbox, setOutbox] = useState([]);
  const [userMap, setUserMap] = useState({});
  const myProductIds = useRef([]);
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

        const allUsersSnap = await get(ref(db, "users"));
        const map = {};
        if (allUsersSnap.exists()) {
          Object.entries(allUsersSnap.val()).forEach(([id, d]) => {
            map[id] = d.name || "Unknown";
          });
        }
        setUserMap(map);

        const prodSnap = await get(ref(db, "products"));
        const images = [];
        const ids = [];
        if (prodSnap.exists()) {
          Object.entries(prodSnap.val()).forEach(([id, p]) => {
            if (p.uid === u.uid) {
              if (p.image) images.push(p.image);
              ids.push(id);
            }
          });
        }
        myProductIds.current = ids;
        setPostedImages(images);

        const allInboxRef = ref(db, "inbox");
        onValue(allInboxRef, (snap) => {
          const messages = [];
          if (snap.exists()) {
            Object.entries(snap.val()).forEach(([toId, msgs]) => {
              Object.entries(msgs).forEach(([msgId, msg]) => {
                if (
                  msg.toId === u.uid &&
                  msg.productId &&
                  myProductIds.current.includes(msg.productId)
                ) {
                  messages.push({ ...msg, id: msgId });
                }
              });
            });
          }
          const sorted = [
            ...messages.filter((m) => !m.read).sort((a, b) => b.timestamp - a.timestamp),
            ...messages.filter((m) => m.read).sort((a, b) => b.timestamp - a.timestamp),
          ];
          setInbox(sorted);
          setUnreadCount(sorted.filter((m) => !m.read).length);
        });

        const allInbox = await get(ref(db, "inbox"));
        const sent = [];
        if (allInbox.exists()) {
          Object.entries(allInbox.val()).forEach(([toId, msgs]) => {
            Object.entries(msgs).forEach(([msgId, msg]) => {
              if (msg.fromId === u.uid) {
                sent.push({ ...msg, id: msgId, to: toId });
              }
            });
          });
        }
        setOutbox(sent.sort((a, b) => b.timestamp - a.timestamp));
      } else {
        setUser(null);
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) Afribase Inbox`;
    } else {
      document.title = "Afribase Profile";
    }
  }, [unreadCount]);

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

  const sendReply = async () => {
    if (!reply || !selectedMsg || !user) return;
    const replyData = {
      fromId: user.uid,
      fromName: profileData.name,
      toId: selectedMsg.fromId,
      productId: selectedMsg.productId,
      message: reply,
      timestamp: Date.now(),
    };
    await push(ref(db, `inbox/${selectedMsg.fromId}`), replyData);
    setReply("");
    setSelectedMsg(null);
  };

  const deleteMessage = async () => {
    if (!user || !selectedMsg) return;
    await remove(ref(db, `inbox/${user.uid}/${selectedMsg.id}`));
    setSelectedMsg(null);
  };

  const markAsRead = async (msg) => {
    if (!msg.read) {
      await update(ref(db, `inbox/${user.uid}/${msg.id}`), { read: true });
    }
    setSelectedMsg(msg);
  };

  const timeAgo = (ts) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  if (!user) return <p>Loading...</p>;

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif", background: "#f9f9f9", color: "#111", minHeight: "100vh" }}>
      {/* Top Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div onClick={() => setMenuOpen(!menuOpen)} style={{ fontSize: 28, cursor: "pointer" }}>
          ☰ {unreadCount > 0 && <span style={{ background: "red", color: "white", borderRadius: "50%", padding: "2px 8px", fontSize: 14 }}>{unreadCount}</span>}
        </div>
        <div style={{ fontSize: 22, fontWeight: "bold" }}>AFRIBASE</div>
      </div>

      {/* Sidebar */}
      {menuOpen && (
        <div style={{ background: "#fff", color: "#111", padding: 15, borderRadius: 10, marginTop: 10 }}>
          <h3>✉️ Inbox</h3>
          {inbox.length > 0 ? inbox.map((m) => (
            <div key={m.id} onClick={() => markAsRead(m)} style={{ marginBottom: 10, cursor: "pointer", fontWeight: m.read ? "normal" : "bold" }}>
              {m.fromName}: {m.message.slice(0, 30)}... <small>({timeAgo(m.timestamp)})</small>
            </div>
          )) : <p>No messages yet</p>}
          <h3✉️ Outbox</h3>
          {outbox.length > 0 ? outbox.map((m, i) => (
            <div key={i}>
              To {userMap[m.to]}: {m.message.slice(0, 30)}... <small>({timeAgo(m.timestamp)})</small>
            </div>
          )) : <p>No sent messages</p>}
          <hr />
          <p onClick={handleLogout} style={{ color: "red", cursor: "pointer" }}>🚪 Logout</p>
        </div>
      )}

      {/* Message Modal */}
      {selectedMsg && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center" }} onClick={() => setSelectedMsg(null)}>
          <div style={{ background: "#fff", padding: 20, borderRadius: 10, width: "90%", maxWidth: 400, color: "#000" }} onClick={(e) => e.stopPropagation()}>
            <h3>From: {selectedMsg.fromName}</h3>
            <p>{selectedMsg.message}</p>
            <p><small>{timeAgo(selectedMsg.timestamp)}</small></p>
            <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply..." style={{ width: "100%", padding: 8, marginBottom: 10 }} />
            <button onClick={sendReply} style={{ marginRight: 10 }}>Send</button>
            <button onClick={deleteMessage} style={{ color: "red" }}>Delete</button>
          </div>
        </div>
      )}

      {/* Profile Card */}
      <div style={{ background: "#fff", borderRadius: 20, padding: 30, maxWidth: 400, margin: "40px auto", textAlign: "center" }}>
        <div style={{ width: 100, height: 100, borderRadius: "50%", background: "#ccc", margin: "0 auto 20px", overflow: "hidden", cursor: "pointer" }} onClick={() => document.getElementById("fileInput").click()}>
          {profileData.image ? <img src={profileData.image} alt="profile" style={{ width: "100%", height: "100%" }} /> : <span style={{ fontSize: 32 }}>👤</span>}
        </div>
        <input type="file" id="fileInput" style={{ display: "none" }} onChange={handleImageUpload} />
        <h2>{profileData.name}</h2>
        <p>{profileData.email}</p>
        {uploading && <p>Uploading...</p>}
        <button onClick={handleNameChange}>✏️ Edit Name</button>

        <h3 style={{ marginTop: 30 }}>📸 Your Posts</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginTop: 10 }}>
          {postedImages.map((img, i) => (
            <img key={i} src={img} alt="post" style={{ width: 100, height: 100, objectFit: "cover", borderRadius: 10 }} />
          ))}
        </div>
      </div>
    </div>
  );
}
