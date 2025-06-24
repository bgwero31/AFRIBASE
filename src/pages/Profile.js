import React, { useEffect, useState, useRef } from "react"; import { getAuth, signOut, onAuthStateChanged, } from "firebase/auth"; import { ref, get, child, update, remove, push, onValue, } from "firebase/database"; import { db } from "../firebase";

const auth = getAuth(); const imgbbKey = "30df4aa05f1af3b3b58ee8a74639e5cf";

export default function Profile() { const [user, setUser] = useState(null); const [profileData, setProfileData] = useState({}); const [uploading, setUploading] = useState(false); const [menuOpen, setMenuOpen] = useState(false); const [postedImages, setPostedImages] = useState([]); const [inbox, setInbox] = useState([]); const [unreadCount, setUnreadCount] = useState(0); const [selectedMsg, setSelectedMsg] = useState(null); const [reply, setReply] = useState(""); const [outbox, setOutbox] = useState([]); const [userMap, setUserMap] = useState({}); const inboxRef = useRef(); const audio = useRef(null);

useEffect(() => { audio.current = new Audio("/notify.mp3"); }, []);

useEffect(() => { const unsub = onAuthStateChanged(auth, async (u) => { if (u) { setUser(u); const userSnap = await get(child(ref(db), users/${u.uid})); if (userSnap.exists()) setProfileData(userSnap.val());

const allUsersSnap = await get(ref(db, `users`));
    const map = {};
    if (allUsersSnap.exists()) {
      Object.entries(allUsersSnap.val()).forEach(([id, d]) => {
        map[id] = d.name || "Unknown";
      });
    }
    setUserMap(map);

    const prodSnap = await get(ref(db, `products`));
    const posts = [];
    if (prodSnap.exists()) {
      Object.values(prodSnap.val()).forEach((p) => {
        if (p.uid === u.uid && p.image) posts.push(p.image);
      });
    }
    setPostedImages(posts);

    inboxRef.current = ref(db, `inbox/${u.uid}`);
    let firstLoad = true;
    onValue(inboxRef.current, (snap) => {
      if (snap.exists()) {
        const msgs = Object.entries(snap.val()).map(([id, m]) => ({ id, ...m }));
        const sorted = [
          ...msgs.filter((m) => !m.read).sort((a, b) => b.timestamp - a.timestamp),
          ...msgs.filter((m) => m.read).sort((a, b) => b.timestamp - a.timestamp),
        ];
        if (!firstLoad && sorted.length > inbox.length) {
          audio.current?.play().catch(() => {});
        }
        firstLoad = false;
        setInbox(sorted);
        setUnreadCount(sorted.filter((m) => !m.read).length);
      } else {
        setInbox([]);
        setUnreadCount(0);
      }
    });

    const allInbox = await get(ref(db, `inbox`));
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

const handleImageUpload = async (e) => { const file = e.target.files[0]; if (!file || !user) return; setUploading(true); const formData = new FormData(); formData.append("image", file); const res = await fetch(https://api.imgbb.com/1/upload?key=${imgbbKey}, { method: "POST", body: formData, }); const data = await res.json(); const url = data.data.url; await update(ref(db, users/${user.uid}), { image: url }); setProfileData((prev) => ({ ...prev, image: url })); setUploading(false); };

const handleNameChange = async () => { const name = prompt("Enter new name:"); if (!name || !user) return; await update(ref(db, users/${user.uid}), { name }); setProfileData((prev) => ({ ...prev, name })); };

const handleLogout = async () => { await signOut(auth); window.location.href = "/"; };

const sendReply = async () => { if (!reply || !selectedMsg || !user) return; const replyData = { fromId: user.uid, fromName: profileData.name, message: reply, timestamp: Date.now(), }; await push(ref(db, inbox/${selectedMsg.fromId}), replyData); setReply(""); setSelectedMsg(null); alert("Reply sent!"); };

const deleteMessage = async () => { if (!user || !selectedMsg) return; await remove(ref(db, inbox/${user.uid}/${selectedMsg.id})); setSelectedMsg(null); };

const markAsRead = async (msg) => { if (!msg.read) { await update(ref(db, inbox/${user.uid}/${msg.id}), { read: true }); } setSelectedMsg(msg); };

const timeAgo = (ts) => { const diff = Math.floor((Date.now() - ts) / 1000); if (diff < 60) return ${diff}s ago; if (diff < 3600) return ${Math.floor(diff / 60)}m ago; if (diff < 86400) return ${Math.floor(diff / 3600)}h ago; return ${Math.floor(diff / 86400)}d ago; };

if (!user) return null;

return ( <div style={{ backgroundImage: "url('/assets/IMG-20250620-WA0007.jpg')", backgroundSize: "cover", backgroundPosition: "center", minHeight: "100vh", padding: "20px", display: "flex", justifyContent: "center", alignItems: "flex-start" }}> {/* Hamburger */} <div style={{ position: "absolute", top: 20, left: 20, fontSize: 26, cursor: "pointer", zIndex: 20 }} onClick={() => setMenuOpen(!menuOpen)}> ☰ {unreadCount > 0 && <span style={{ background: "red", color: "#fff", borderRadius: "50%", padding: "2px 6px", fontSize: "12px", marginLeft: "4px" }}>{unreadCount}</span>} </div>

{/* Menu */}
  {menuOpen && (
    <div style={{ position: "absolute", top: 60, left: 20, width: "250px", background: "#fff", boxShadow: "4px 4px 12px rgba(0,0,0,0.15)", padding: 15, borderRadius: 12, zIndex: 19 }}>
      <p style={{ fontWeight: "bold", fontSize: 16, marginBottom: 8 }}>⚙️ Preferences</p>
      <p style={{ fontSize: 15, padding: "10px 5px", cursor: "pointer", borderBottom: "1px solid #eee" }} onClick={() => alert("Preferences coming soon")}>🔧 App Settings</p>
      <p style={{ fontSize: 15, padding: "10px 5px", cursor: "pointer", borderBottom: "1px solid #eee" }} onClick={() => alert("Dark mode coming soon")}>🌓 Toggle Theme</p>
      <p style={{ fontSize: 15, padding: "10px 5px", cursor: "pointer", color: "red" }} onClick={handleLogout}>🚪 Logout</p>
    </div>
  )}

  {/* Main Card */}
  <div style={{ background: "#fff", borderRadius: "20px", padding: "30px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", textAlign: "center", maxWidth: "400px", width: "100%" }}>
    <div style={{ width: "100px", height: "100px", borderRadius: "50%", background: "#ddd", margin: "0 auto 20px", overflow: "hidden", cursor: "pointer" }} onClick={() => document.getElementById("fileInput").click()}>
      {profileData.image ? (
        <img src={profileData.image} alt="profile" style={{ width: "100%", height: "100%", borderRadius: "50%" }} />
      ) : (
        <p style={{ fontSize: 30, marginTop: 28 }}>👤</p>
      )}
    </div>
    <input id="fileInput" type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
    <h2 style={{ fontSize: "24px", fontWeight: "700", margin: "10px 0 5px" }}>{profileData.name}</h2>
    <p style={{ fontSize: "14px", color: "#777", marginBottom: "15px" }}>{profileData.email}</p>
    {uploading && <p>Uploading...</p>}
    <button style={{ background: "#00cc88", color: "#fff", padding: "10px 20px", border: "none", borderRadius: "10px", fontWeight: "600", cursor: "pointer", marginTop: "10px" }} onClick={handleNameChange}>✏️ Edit Name</button>

    {/* Stats */}
    <div style={{ display: "flex", justifyContent: "space-around", marginBottom: "20px", fontSize: "14px", color: "#555" }}>
      <div><strong>{profileData.posts || 0}</strong><p>Posts</p></div>
      <div><strong>{profileData.likes || 0}</strong><p>Likes</p></div>
      <div><strong>{profileData.comments || 0}</strong><p>Comments</p></div>
    </div>

    {/* Inbox */}
    <h3>📥 Inbox ({unreadCount})</h3>
    <div style={{ maxHeight: "150px", overflowY: "auto", textAlign: "left", marginTop: "10px", padding: "5px", border: "1px solid #ddd", borderRadius: "10px", background: "#f9f9f9" }}>
      {inbox.length ? inbox.map((m) => (
        <p key={m.id} onClick={() => markAsRead(m)} style={{ margin: "5px 0", padding: "5px", borderBottom: "1px solid #eee", cursor: "pointer", fontWeight: m.read ? "normal" : "bold" }}>
          <strong>{m.fromName}</strong>: {m.message.slice(0, 25)}... <small>({timeAgo(m.timestamp)})</small>
        </p>
      )) : <p>No messages</p>}
    </div>

    {/* Outbox */}
    <h3>📤 Outbox</h3>
    <div style={{ maxHeight: "150px", overflowY: "auto", textAlign: "left", marginTop: "10px", padding: "5px", border: "1px solid #ddd", borderRadius: "10px", background: "#f9f9f9" }}>
      {outbox.length ? outbox.map((m, i) => (
        <p key={i} style={{ margin: "5px 0", padding: "5px", borderBottom: "1px solid #eee" }}>
          To <strong>{userMap[m.to]}</strong>: {m.message.slice(0, 25)}... <small>({timeAgo(m.timestamp)})</small>
        </p>
      )) : <p>No sent messages</p>}
    </div>

    {/* Posts */}
    <h3>📸 Your Posts</h3>
    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center", marginTop: "10px" }}>
      {postedImages.length ? postedImages.map((img, i) => (
        <img key={i} src={img} alt="post" style={{ width: "100px", height: "100px", objectFit: "cover", borderRadius: "10px" }} />
      )) : <p>No posts yet</p>}
    </div>
  </div>

  {/* Message Modal */}
  {selectedMsg && (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.4)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100 }} onClick={() => setSelectedMsg(null)}>
      <div style={{ background: "#fff", padding: "20px", borderRadius: "10px", width: "90%", maxWidth: "400px", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
        <h3>📨 Message</h3>
        <p><strong>From:</strong> {selectedMsg.fromName}</p>
        <p>{selectedMsg.message}</p>
        <input style={{ width: "90%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc", marginBottom: "10px" }} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply..." />
        <button style={{ background: "#00cc88", color: "#fff", padding: "10px 20px", border: "none", borderRadius: "10px", fontWeight: "600", cursor: "pointer", marginTop: "10px" }} onClick={sendReply}>Send</button>
        <button style={{ background: "#f44336", color: "#fff", padding: "10px 20px", border: "none", borderRadius: "10px", fontWeight: "600", cursor: "pointer", marginTop: "10px" }} onClick={deleteMessage}>Delete</button>
        <button onClick={() => setSelectedMsg(null)}>Close</button>
      </div>
    </div>
  )}
</div>

); }

