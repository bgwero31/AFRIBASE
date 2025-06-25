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
  const audio = useRef(null);

  useEffect(() => {
    audio.current = new Audio("/notify.mp3");
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
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

        const prodSnap = await get(ref(db, "products"));
        const myProducts = [];
        const postImages = [];
        if (prodSnap.exists()) {
          Object.entries(prodSnap.val()).forEach(([id, p]) => {
            if (p.uid === u.uid) {
              if (p.image) postImages.push(p.image);
              myProducts.push(id);
            }
          });
        }
        setPostedImages(postImages);

        const inboxSnapRef = ref(db, "inbox");
        onValue(inboxSnapRef, (snap) => {
          const messages = [];
          if (snap.exists()) {
            Object.entries(snap.val()).forEach(([toId, msgs]) => {
              Object.entries(msgs).forEach(([id, m]) => {
                if (m.toId === u.uid && m.productId && myProducts.includes(m.productId)) {
                  messages.push({ ...m, id });
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

        const allInboxSnap = await get(ref(db, "inbox"));
        const sent = [];
        if (allInboxSnap.exists()) {
          Object.entries(allInboxSnap.val()).forEach(([toId, msgs]) => {
            Object.entries(msgs).forEach(([id, m]) => {
              if (m.fromId === u.uid) {
                sent.push({ ...m, id, to: toId });
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
    <div style={{ padding: 20 }}>
      <div style={{ position: "absolute", top: 20, left: 20 }}>
        <span style={{ fontSize: 24, cursor: "pointer" }} onClick={() => setMenuOpen(!menuOpen)}>☰</span>
        {unreadCount > 0 && (
          <span style={{
            background: "red",
            color: "white",
            borderRadius: "50%",
            padding: "3px 7px",
            fontSize: 12,
            marginLeft: 5,
          }}>{unreadCount}</span>
        )}
      </div>

      {menuOpen && (
        <div style={{
          position: "absolute",
          top: 60,
          left: 20,
          background: "#fff",
          padding: 20,
          borderRadius: 10,
          width: "90%",
          maxWidth: 350,
          boxShadow: "0 0 12px rgba(0,0,0,0.1)",
          zIndex: 100
        }}>
          <h4>📨 Inbox</h4>
          {inbox.map((m) => (
            <div key={m.id} style={{ marginBottom: 10, cursor: "pointer" }} onClick={() => markAsRead(m)}>
              <b>{m.fromName}</b>: {m.message.slice(0, 30)}...
              <br /><small>{timeAgo(m.timestamp)}</small>
            </div>
          ))}
          <hr />
          <h4>📤 Outbox</h4>
          {outbox.map((m, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              To <b>{userMap[m.to]}</b>: {m.message.slice(0, 30)}...
              <br /><small>{timeAgo(m.timestamp)}</small>
            </div>
          ))}
          <hr />
          <p onClick={() => alert("Preferences soon")}>⚙️ Settings</p>
          <p onClick={handleLogout} style={{ color: "red" }}>🚪 Logout</p>
        </div>
      )}

      {selectedMsg && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex", justifyContent: "center", alignItems: "center"
        }} onClick={() => setSelectedMsg(null)}>
          <div style={{
            background: "#fff", padding: 20,
            borderRadius: 10, width: "90%", maxWidth: 400
          }} onClick={(e) => e.stopPropagation()}>
            <h3>Message</h3>
            <p><b>From:</b> {selectedMsg.fromName}</p>
            <p>{selectedMsg.message}</p>
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Reply..."
              style={{ width: "100%", padding: 10, marginBottom: 10 }}
            />
            <button onClick={sendReply} style={{ marginRight: 10 }}>Send</button>
            <button onClick={deleteMessage} style={{ color: "red" }}>Delete</button>
          </div>
        </div>
      )}
    </div>
  );
}
