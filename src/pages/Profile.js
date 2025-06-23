import React, { useEffect, useState, useRef } from "react";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  ref,
  set,
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
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    image: "",
    vip: false,
    posts: 0,
    likes: 0,
    comments: 0,
  });
  const [form, setForm] = useState({ email: "", password: "" });
  const [uploading, setUploading] = useState(false);

  // Inbox and messaging states
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

  // Auth and data loading with inbox realtime listener + cleanup
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);

        // Load profile data or create default
        const snapshot = await get(child(ref(db), `users/${u.uid}`));
        if (snapshot.exists()) {
          setProfileData(snapshot.val());
        } else {
          const defaultData = {
            name: "New User",
            email: u.email,
            image: "",
            vip: false,
            posts: 0,
            likes: 0,
            comments: 0,
          };
          await set(ref(db, `users/${u.uid}`), defaultData);
          setProfileData(defaultData);
        }

        // Load all usernames for mapping
        const allUsersSnap = await get(ref(db, `users`));
        const map = {};
        if (allUsersSnap.exists()) {
          Object.entries(allUsersSnap.val()).forEach(([id, d]) => {
            map[id] = d.name || "Unknown";
          });
        }
        setUserMap(map);

        // Load products posted by this user for gallery
        const prodSnap = await get(ref(db, `products`));
        const posts = [];
        if (prodSnap.exists()) {
          Object.values(prodSnap.val()).forEach((p) => {
            if (p.uid === u.uid && p.image) posts.push(p.image);
          });
        }
        setProfileData((prev) => ({ ...prev, posts: posts.length }));
        setPostedImages(posts);

        // Inbox realtime listener
        inboxRef.current = ref(db, `inbox/${u.uid}`);
        let firstLoad = true;
        const unsubscribeInbox = onValue(inboxRef.current, (snap) => {
          if (snap.exists()) {
            const msgs = Object.entries(snap.val()).map(([id, m]) => ({
              id,
              ...m,
            }));
            // Sort unread on top, newest first
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

        // Load outbox messages (sent)
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

        // Cleanup function to unsubscribe inbox realtime listener
        return () => {
          unsubscribeInbox();
        };
      } else {
        setUser(null);
      }
    });

    return () => unsub();
  }, []);

  // Uploaded posts images state
  const [postedImages, setPostedImages] = useState([]);

  // Handle image upload to imgbb
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch(
        `https://api.imgbb.com/1/upload?key=${imgbbKey}`,
        { method: "POST", body: formData }
      );
      const data = await res.json();
      if (data && data.data && data.data.url) {
        const imageUrl = data.data.url;
        await update(ref(db, `users/${user.uid}`), { image: imageUrl });
        setProfileData((prev) => ({ ...prev, image: imageUrl }));
      } else {
        alert("Image upload failed");
      }
    } catch (err) {
      alert("Upload error: " + err.message);
    }
    setUploading(false);
  };

  // Handle name change prompt
  const handleNameChange = async () => {
    const newName = prompt("Enter your name:");
    if (!newName || !user) return;
    await update(ref(db, `users/${user.uid}`), { name: newName });
    setProfileData((prev) => ({ ...prev, name: newName }));
  };

  // Messaging functions
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
    alert("Reply sent!");
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

  // Time ago helper
  const timeAgo = (ts) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  // Login handler
  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, form.email, form.password);
    } catch (err) {
      alert("Login failed: " + err.message);
    }
  };

  // Signup handler
  const handleSignup = async () => {
    try {
      const res = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );
      const defaultData = {
        name: "New User",
        email: res.user.email,
        image: "",
        vip: false,
        posts: 0,
        likes: 0,
        comments: 0,
      };
      await set(ref(db, `users/${res.user.uid}`), defaultData);
    } catch (err) {
      alert("Signup failed: " + err.message);
    }
  };

  // Logout
  const handleLogout = () => signOut(auth);

  // If not logged in, show login/signup form
  if (!user) {
    return (
      <div style={container}>
        <div style={card}>
          <h2>Welcome to Afribase</h2>
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            style={input}
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            style={input}
          />
          <button style={button} onClick={handleLogin}>
            Sign In
          </button>
          <button
            style={{ ...button, background: "#0077cc" }}
            onClick={handleSignup}
          >
            Sign Up
          </button>
        </div>
      </div>
    );
  }

  // Logged in profile UI with inbox and posts gallery
  return (
    <div style={container}>
      {/* Inbox badge and menu toggle */}
      <div
        style={hamburger}
        onClick={() => setMenuOpen((open) => !open)}
        title="Toggle Inbox"
      >
        ☰
        {unreadCount > 0 && <span style={badge}>{unreadCount}</span>}
      </div>

      {/* Inbox menu */}
      {menuOpen && (
        <div style={menu}>
          <p style={menuTitle}>📥 Inbox</p>
          {inbox.length ? (
            inbox.map((m) => (
              <p
                key={m.id}
                onClick={() => markAsRead(m)}
                style={{
                  ...menuItem,
                  fontWeight: m.read ? "normal" : "bold",
                  cursor: "pointer",
                }}
              >
                <strong>{m.fromName}</strong>: {m.message.slice(0, 25)}... (
                {timeAgo(m.timestamp)})
              </p>
            ))
          ) : (
            <p style={menuItem}>No messages</p>
          )}
          <hr />
          <p style={menuTitle}>📤 Outbox</p>
          {outbox.length ? (
            outbox.map((m, i) => (
              <p key={i} style={menuItem}>
                To <strong>{userMap[m.to]}</strong>: {m.message.slice(0, 25)}... (
                {timeAgo(m.timestamp)})
              </p>
            ))
          ) : (
            <p style={menuItem}>No sent messages</p>
          )}
          <hr />
          <p style={menuItem} onClick={() => alert("Preferences coming")}>
            ⚙️ Preferences
          </p>
          <p style={menuItem} onClick={() => alert("Dark mode soon")}>
            🌓 Theme
          </p>
          <p style={{ ...menuItem, color: "red" }} onClick={handleLogout}>
            🚪 Logout
          </p>
        </div>
      )}

      {/* Message modal */}
      {selectedMsg && (
        <div style={modalOverlay} onClick={() => setSelectedMsg(null)}>
          <div style={modal} onClick={(e) => e.stopPropagation()}>
            <h3>📨 Message</h3>
            <p>
              <strong>From:</strong> {selectedMsg.fromName}
            </p>
            <p>{selectedMsg.message}</p>
            <input
              style={input}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Reply..."
            />
            <button style={button} onClick={sendReply}>
              Send
            </button>
            <button
              style={{ ...button, background: "#f44336" }}
              onClick={deleteMessage}
            >
              Delete
            </button>
            <button onClick={() => setSelectedMsg(null)}>Close</button>
          </div>
        </div>
      )}

      {/* Profile Card */}
      <div style={card}>
        <div
          style={avatar}
          onClick={() => document.getElementById("fileInput").click()}
          title="Click to change profile image"
        >
          {profileData.image ? (
            <img
              src={profileData.image}
              alt="Profile"
              style={{ width: "100%", height: "100%", borderRadius: "50%" }}
            />
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
        {uploading && <p>Uploading...</p>}

        <h2 style={name}>{profileData.name}</h2>
        <p style={tagline}>{profileData.email}</p>

        {profileData.vip && <div style={vipBadge}>🌟 VIP</div>}

        <div style={stats}>
          <div>
            <strong>{profileData.posts || 0}</strong>
            <p>Posts</p>
          </div>
          <div>
            <strong>{profileData.likes || 0}</strong>
            <p>Likes</p>
          </div>
          <div>
            <strong>{profileData.comments || 0}</strong>
            <p>Comments</p>
          </div>
        </div>

        <h3>📸 Your Posts</h3>
        <div style={gallery}>
          {postedImages.length ? (
            postedImages.map((img, i) => (
              <img key={i} src={img} alt="post" style={postImg} />
            ))
          ) : (
            <p>No posts yet</p>
          )}
        </div>

        <button style={button} onClick={handleNameChange}>
          ✏️ Edit Name
        </button>
        <button style={{ ...button, background: "#f44336" }} onClick={handleLogout}>
          🚪 Sign Out
        </button>
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
  fontFamily: "'Poppins', sans-serif",
};
const hamburger = {
  position: "absolute",
  top: 20,
  left: 20,
  fontSize: 26,
  cursor: "pointer",
  zIndex: 10,
};
const badge = {
  background: "red",
  color: "#fff",
  borderRadius: "50%",
  padding: "2px 6px",
  fontSize: "12px",
  marginLeft: "4px",
};
const menu = {
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
};
const menuItem = {
  fontSize: "15px",
  margin: "8px 0",
  cursor: "pointer",
  borderBottom: "1px solid #eee",
  padding: 5,
};
const menuTitle = { fontWeight: "bold", fontSize: 16, marginBottom: 5 };
const modalOverlay = {
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
};
const modal = {
  background: "#fff",
  padding: "20px",
  borderRadius: "10px",
  width: "90%",
  maxWidth: "400px",
  textAlign: "center",
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
  cursor: "pointer",
};
const name = {
  fontSize: "24px",
  fontWeight: "700",
  margin: "10px 0 5px",
};
const tagline = {
  fontSize: "14px",
  color: "#777",
  marginBottom: "15px",
};
const vipBadge = {
  background: "#4caf50",
  color: "#fff",
  padding: "6px 14px",
  borderRadius: "30px",
  fontSize: "12px",
  fontWeight: "600",
  marginBottom: "20px",
  display: "inline-block",
};
const stats = {
  display: "flex",
  justifyContent: "space-around",
  marginBottom: "20px",
  fontSize: "14px",
