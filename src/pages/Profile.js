// ✅ CLEANED & WHATSAPP-STYLED PROFILE.JS import React, { useEffect, useState, useRef } from "react"; import { getAuth, signOut, onAuthStateChanged, } from "firebase/auth"; import { ref, get, child, update, remove, push, onValue, } from "firebase/database"; import { db } from "../firebase";

const auth = getAuth(); const imgbbKey = "30df4aa05f1af3b3b58ee8a74639e5cf";

export default function Profile() { const [user, setUser] = useState(null); const [profileData, setProfileData] = useState({}); const [uploading, setUploading] = useState(false); const [menuOpen, setMenuOpen] = useState(false); const [postedImages, setPostedImages] = useState([]); const [inbox, setInbox] = useState([]); const [unreadCount, setUnreadCount] = useState(0); const [selectedMsg, setSelectedMsg] = useState(null); const [reply, setReply] = useState(""); const [outbox, setOutbox] = useState([]); const [userMap, setUserMap] = useState({}); const inboxRef = useRef(); const audio = useRef(null);

useEffect(() => { audio.current = new Audio("/notify.mp3"); }, []);

useEffect(() => { const unsub = onAuthStateChanged(auth, async (u) => { if (u) { setUser(u); const snap = await get(child(ref(db), users/${u.uid})); if (snap.exists()) setProfileData(snap.val());

const userList = await get(ref(db, `users`));
    const map = {};
    if (userList.exists()) {
      Object.entries(userList.val()).forEach(([id, d]) => {
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
        const msgs = Object.entries(snap.val())
          .map(([id, m]) => ({ id, ...m }))
          .filter((m) => m.message && m.fromName);
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
          if (msg.fromId === u.uid && msg.message && msg.fromName) {
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

const sendReply = async () => { if (!reply || !selectedMsg || !user) return; const msg = { fromId: user.uid, fromName: profileData.name, message: reply, timestamp: Date.now(), }; await push(ref(db, inbox/${selectedMsg.fromId}), msg); setReply(""); setSelectedMsg(null); };

const deleteMessage = async () => { if (!user || !selectedMsg) return; await remove(ref(db, inbox/${user.uid}/${selectedMsg.id})); setSelectedMsg(null); };

const markAsRead = async (msg) => { if (!msg.read) { await update(ref(db, inbox/${user.uid}/${msg.id}), { read: true }); } setSelectedMsg(msg); };

const timeAgo = (ts) => { const diff = Math.floor((Date.now() - ts) / 1000); if (diff < 60) return ${diff}s ago; if (diff < 3600) return ${Math.floor(diff / 60)}m ago; if (diff < 86400) return ${Math.floor(diff / 3600)}h ago; return ${Math.floor(diff / 86400)}d ago; };

if (!user) return <p style={{ padding: 20 }}>Checking...</p>;

return ( <div style={{ backgroundImage: "url('/assets/IMG-20250620-WA0007.jpg')", backgroundSize: "cover", minHeight: "100vh", padding: 20, display: "flex", justifyContent: "center" }}> <div style={{ position: "absolute", top: 20, left: 20, zIndex: 10 }}> <button onClick={() => setMenuOpen(!menuOpen)} style={{ fontSize: 22 }}>☰</button> {unreadCount > 0 && <span style={{ color: "#fff", background: "red", padding: "2px 6px", borderRadius: "50%" }}>{unreadCount}</span>} </div> {menuOpen && ( <div style={{ position: "absolute", top: 60, left: 20, background: "#fff", borderRadius: 10, padding: 15, boxShadow: "0 2px 10px rgba(0,0,0,0.3)" }}> <p onClick={() => alert("Toggle Dark Mode Soon")} style={{ cursor: "pointer" }}>🌓 Toggle Theme</p> <p onClick={handleLogout} style={{ color: "red", cursor: "pointer" }}>🚪 Logout</p> </div> )} <div style={{ background: "#fff", padding: 20, borderRadius: 20, width: 360, marginTop: 60 }}> <div onClick={() => document.getElementById("fileInput").click()} style={{ width: 80, height: 80, borderRadius: "50%", overflow: "hidden", margin: "auto", background: "#ddd", cursor: "pointer" }}> {profileData.image ? <img src={profileData.image} alt="Profile" style={{ width: "100%", height: "100%" }} /> : <p style={{ fontSize: 30, textAlign: "center" }}>👤</p>} </div> <input id="fileInput" type="file" style={{ display: "none" }} onChange={handleImageUpload} /> <h3 style={{ marginTop: 10 }}>{profileData.name}</h3> <p style={{ color: "gray" }}>{profileData.email}</p> <button onClick={handleNameChange}>✏️ Edit Name</button>

<h4>📥 Inbox</h4>
    <div style={{ maxHeight: 120, overflowY: "auto", background: "#f1f1f1", padding: 10, borderRadius: 10 }}>
      {inbox.length ? inbox.map((m) => (
        <p key={m.id} onClick={() => markAsRead(m)} style={{ fontWeight: m.read ? "normal" : "bold", cursor: "pointer" }}>
          <b>{m.fromName}</b>: {m.message.slice(0, 20)}... <small>{timeAgo(m.timestamp)}</small>
        </p>
      )) : <p>No messages</p>}
    </div>

    <h4>📤 Outbox</h4>
    <div style={{ maxHeight: 120, overflowY: "auto", background: "#f1f1f1", padding: 10, borderRadius: 10 }}>
      {outbox.length ? outbox.map((m, i) => (
        <p key={i}>To <b>{userMap[m.to]}</b>: {m.message.slice(0, 20)}... <small>{timeAgo(m.timestamp)}</small></p>
      )) : <p>No sent messages</p>}
    </div>

    <h4>📸 Your Posts</h4>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
      {postedImages.length ? postedImages.map((img, i) => (
        <img key={i} src={img} alt="Post" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 10 }} />
      )) : <p>No posts</p>}
    </div>
  </div>

  {selectedMsg && (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center" }} onClick={() => setSelectedMsg(null)}>
      <div style={{ background: "#fff", padding: 20, borderRadius: 10, width: 300 }} onClick={(e) => e.stopPropagation()}>
        <p><b>From:</b> {selectedMsg.fromName}</p>
        <p>{selectedMsg.message}</p>
        <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply..." style={{ width: "100%", padding: 8, borderRadius: 8, marginBottom: 10 }} />
        <button onClick={sendReply}>Send</button>
        <button onClick={deleteMessage} style={{ color: "red" }}>Delete</button>
      </div>
    </div>
  )}
</div>

); }

