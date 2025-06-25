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

        const allUsersSnap = await get(ref(db, "users"));
        const map = {};
        if (allUsersSnap.exists()) {
          Object.entries(allUsersSnap.val()).forEach(([id, d]) => {
            map[id] = d.name || "Unknown";
          });
        }
        setUserMap(map);

        const prodSnap = await get(ref(db, "products"));
        const posts = [];
        const myProductIds = [];
        if (prodSnap.exists()) {
          Object.entries(prodSnap.val()).forEach(([id, p]) => {
            if (p.uid === u.uid && p.image) {
              posts.push(p.image);
              myProductIds.push(id);
            }
          });
        }
        setPostedImages(posts);

        // ✅ Listen to inbox but filter only messages about your products
        const allInboxRef = ref(db, "inbox");
        onValue(allInboxRef, (snap) => {
          const results = [];
          if (snap.exists()) {
            Object.entries(snap.val()).forEach(([toId, msgs]) => {
              Object.entries(msgs).forEach(([msgId, msg]) => {
                if (
                  msg.toId === u.uid &&
                  msg.productId &&
                  myProductIds.includes(msg.productId)
                ) {
                  results.push({ ...msg, id: msgId });
                }
              });
            });
          }
          const sorted = [
            ...results.filter((m) => !m.read).sort((a, b) => b.timestamp - a.timestamp),
            ...results.filter((m) => m.read).sort((a, b) => b.timestamp - a.timestamp),
          ];
          setInbox(sorted);
          setUnreadCount(sorted.filter((m) => !m.read).length);
        });

        // ✅ Load outbox
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
    <div style={styles.container}>
      <div style={styles.hamburger} onClick={() => setMenuOpen(!menuOpen)}>
        ☰
        {unreadCount > 0 && (
          <span style={styles.badge}>{unreadCount}</span>
        )}
      </div>

      {menuOpen && (
        <div style={styles.menu}>
          <p style={styles.menuTitle}>📥 Inbox</p>
          {inbox.length ? (
            inbox.map((m) => (
              <p
                key={m.id}
                onClick={() => markAsRead(m)}
                style={{
                  ...styles.menuItem,
                  fontWeight: m.read ? "normal" : "bold",
                }}
              >
                <strong>{m.fromName}</strong>: {m.message.slice(0, 30)}...{" "}
                <small>({timeAgo(m.timestamp)})</small>
              </p>
            ))
          ) : (
            <p style={styles.menuItem}>No messages</p>
          )}
          <hr />
          <p style={styles.menuTitle}>📤 Outbox</p>
          {outbox.length ? (
            outbox.map((m, i) => (
              <p key={i} style={styles.menuItem}>
                To <strong>{userMap[m.to]}</strong>:{" "}
                {m.message.slice(0, 30)}... ({timeAgo(m.timestamp)})
              </p>
            ))
          ) : (
            <p style={styles.menuItem}>No sent messages</p>
          )}
          <hr />
          <p style={styles.menuItem} onClick={() => alert("Settings soon")}>⚙️ Settings</p>
          <p style={styles.menuItem} onClick={() => alert("Theme soon")}>🌓 Theme</p>
          <p style={{ ...styles.menuItem, color: "red" }} onClick={handleLogout}>
            🚪 Logout
          </p>
        </div>
      )}

      {selectedMsg && (
        <div style={styles.modalOverlay} onClick={() => setSelectedMsg(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>📨 Message</h3>
            <p><strong>From:</strong> {selectedMsg.fromName}</p>
            <p>{selectedMsg.message}</p>
            <input
              style={styles.input}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Reply..."
            />
            <button style={styles.button} onClick={sendReply}>Send</button>
            <button
              style={{ ...styles.button, background: "#f44336" }}
              onClick={deleteMessage}
            >
              Delete
            </button>
            <button onClick={() => setSelectedMsg(null)}>Close</button>
          </div>
        </div>
      )}

      <div style={styles.card}>
        <div style={styles.avatar} onClick={() => document.getElementById("fileInput").click()}>
          {profileData.image ? (
            <img src={profileData.image} alt="profile" style={{ width: "100%", height: "100%", borderRadius: "50%" }} />
          ) : (
            <p style={{ fontSize: 30, marginTop: 28 }}>👤</p>
          )}
        </div>
        <input
          id="fileInput"
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          style={{ display: "none" }}
        />
        <h2 style={styles.name}>{profileData.name}</h2>
        <p style={styles.tagline}>{profileData.email}</p>
        {uploading && <p>Uploading...</p>}
        <button style={styles.button} onClick={handleNameChange}>✏️ Edit Name</button>
        <h3>📸 Your Posts</h3>
        <div style={styles.gallery}>
          {postedImages.length ? postedImages.map((img, i) => (
            <img key={i} src={img} alt="post" style={styles.postImg} />
          )) : <p>No posts yet</p>}
        </div>
      </div>
    </div>
  );
}

// Styles
const styles = {
  container: {
    position: "relative",
    padding: 20,
    backgroundImage: "url('/assets/IMG-20250620-WA0007.jpg')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  hamburger: {
    position: "absolute",
    top: 20,
    left: 20,
    fontSize: 26,
    cursor: "pointer",
    zIndex: 10,
  },
  badge: {
    background: "red",
    color: "#fff",
    borderRadius: "50%",
    padding: "2px 6px",
    fontSize: "12px",
    marginLeft: "4px",
  },
  menu: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "80%",
    height: "100vh",
    background: "#fff",
    boxShadow: "4px 0 12px rgba(0,0,0,0.1)",
    padding: 20,
    zIndex: 9,
    overflowY: "auto",
  },
  menuItem: {
    fontSize: "15px",
    margin: "8px 0",
    cursor: "pointer",
    borderBottom: "1px solid #eee",
    padding: 5,
  },
  menuTitle: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 5,
  },
  modalOverlay: {
    position: "fixed",
    top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  modal: {
    background: "#fff",
    padding: 20,
    borderRadius: 10,
    width: "90%",
    maxWidth: 400,
    textAlign: "center",
  },
  card: {
    background: "rgba(255,255,255,0.8)",
    borderRadius: 20,
    padding: 30,
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    textAlign: "center",
    maxWidth: 350,
    width: "100%",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: "50%",
    background: "#ddd",
    margin: "0 auto 20px",
    overflow: "hidden",
    cursor: "pointer",
  },
  name: {
    fontSize: 24,
    fontWeight: "700",
    margin: "10px 0 5px",
  },
  tagline: {
    fontSize: 14,
    color: "#777",
    marginBottom: 15,
  },
  button: {
    background: "#00cc88",
    color: "#fff",
    padding: "10px 20px",
    border: "none",
    borderRadius: 10,
    fontWeight: "600",
    cursor: "pointer",
    marginTop: 10,
  },
  gallery: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
    marginTop: 10,
  },
  postImg: {
    width: 100,
    height: 100,
    objectFit: "cover",
    borderRadius: 10,
  },
  input: {
    width: "90%",
    padding: 10,
    borderRadius: 8,
    border: "1px solid #ccc",
    marginBottom: 10,
  },
};
