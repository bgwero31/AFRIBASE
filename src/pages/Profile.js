import React, { useEffect, useState, useRef } from "react";
import {
  getAuth,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  ref,
  get,
  update,
  push,
  onValue,
} from "firebase/database";
import { db } from "../firebase";

const auth = getAuth();

export default function Profile() {
  const [user, setUser] = useState(null);
  const [profileData, setProfileData] = useState({});
  const [postedProducts, setPostedProducts] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [outbox, setOutbox] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showInbox, setShowInbox] = useState(false);
  const [showOutbox, setShowOutbox] = useState(false);
  const [selectedMsg, setSelectedMsg] = useState(null);
  const [reply, setReply] = useState("");
  const [userMap, setUserMap] = useState({});
  const inboxRef = useRef();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) return setUser(null);
      setUser(u);

      const snap = await get(ref(db, `users/${u.uid}`));
      if (snap.exists()) setProfileData(snap.val());

      const productsSnap = await get(ref(db, "products"));
      const myProducts = [];
      if (productsSnap.exists()) {
        Object.entries(productsSnap.val()).forEach(([id, prod]) => {
          prod.uid === u.uid && myProducts.push({ id, ...prod });
        });
      }
      setPostedProducts(myProducts);

      const uSnap = await get(ref(db, "users"));
      const map = {};
      if (uSnap.exists()) Object.entries(uSnap.val()).forEach(([id, d]) => map[id] = d.name);
      setUserMap(map);

      // listen only to messages tied to your products
      inboxRef.current = ref(db, "inbox");
      onValue(inboxRef.current, async (snap) => {
        const all = snap.exists() ? Object.values(snap.val()).flatMap(Object.values) : [];
        const filtered = all.filter(m =>
          m.fromId && m.toId === u.uid && myProducts.some(p => p.id === m.productId)
        );
        setInbox(filtered);
        setUnreadCount(filtered.filter(m => !m.read).length);
      });

      const allSnap = await get(ref(db, "inbox"));
      const sent = [];
      if (allSnap.exists()) {
        Object.entries(allSnap.val()).forEach(([toId, msgs]) => {
          Object.entries(msgs).forEach(([mid, m]) => {
            if (m.fromId === u.uid) sent.push({ ...m, id: mid, to: toId });
          });
        });
      }
      setOutbox(sent);
    });
    return ()=>unsub();
  }, []);

  const sendReply = async () => {
    if (!reply || !selectedMsg) return;
    await push(ref(db, `inbox/${selectedMsg.fromId}`), {
      ...selectedMsg,
      fromId: user.uid,
      fromName: profileData.name,
      message: reply,
      timestamp: Date.now(),
      productId: selectedMsg.productId,
    });
    setReply("");
    setSelectedMsg(null);
  };

  const markAsRead = async (msg) => {
    if (!msg.read) {
      await update(ref(db, `inbox/${user.uid}/${msg.id}`), { read: true });
    }
    setSelectedMsg(msg);
  };

  const formatTime = ts => new Date(ts).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

  if (!user) return <p>Checking...</p>;

  return (
    <div style={styles.container}>
      <div style={styles.menu}>
        <button onClick={() => setShowInbox(!showInbox)}>
          📥 Inbox {unreadCount > 0 && `(${unreadCount})`}
        </button>
        <button onClick={() => setShowOutbox(!showOutbox)}>
          📤 Outbox ({outbox.length})
        </button>
        <button onClick={() => alert("Open Settings")}>⚙️ Settings</button>
        <button onClick={() => alert("Toggle Theme")}>🌓</button>
        <button onClick={() => signOut(auth)}>🚪 Logout</button>
      </div>

      <div style={styles.card}>
        <img src={profileData.image} alt="profile" style={styles.avatar} />
        <h3>{profileData.name}</h3>
        <p style={{ color: "gray" }}>{profileData.email}</p>

        {showInbox && (
          <div>
            <h4>Inbox</h4>
            {inbox.map(m => (
              <div key={m.id} style={styles.message} onClick={() => markAsRead(m)}>
                <p><b>{m.fromName}</b> <small>{formatTime(m.timestamp)}</small></p>
                <p>{m.message}</p>
              </div>
            ))}
          </div>
        )}

        {showOutbox && (
          <div>
            <h4>Outbox</h4>
            {outbox.map((m, i) => (
              <div key={i} style={styles.message}>
                <p><b>To {userMap[m.toId]}</b> <small>{formatTime(m.timestamp)}</small></p>
                <p>{m.message}</p>
              </div>
            ))}
          </div>
        )}

        {selectedMsg && (
          <div style={styles.modalOverlay} onClick={() => setSelectedMsg(null)}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
              <p><b>Reply to {selectedMsg.fromName}</b></p>
              <textarea
                value={reply}
                onChange={e => setReply(e.target.value)}
                style={styles.textarea}
              />
              <button onClick={sendReply}>Send</button>
              <button onClick={() => setSelectedMsg(null)}>Close</button>
            </div>
          </div>
        )}

        <h4>Your Products</h4>
        <div style={styles.productsGrid}>
          {postedProducts.map(p => (
            <img key={p.id} src={p.image} alt="prod" style={styles.prodImg} />
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    backgroundImage: "url('/assets/IMG-20250620-WA0007.jpg')",
    minHeight: "100vh", padding:20, display: "flex", justifyContent:"center"
  },
  menu: { position: "absolute", top:20, left:20, display:"flex", gap:10, flexWrap:"wrap" },
  card: {
    background:"rgba(255,255,255,0.8)", padding:20,
    borderRadius:20, width:360, textAlign:"center"
  },
  avatar: { width:80, height:80, borderRadius:40, margin:"auto", display:"block" },
  message: {
    margin:5, padding:5,
    border:"1px solid #ddd", borderRadius:5, cursor:"pointer",
  },
  modalOverlay: {
    position:"fixed", top:0, left:0, right:0, bottom:0,
    background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center"
  },
  modal: {
    background:"#fff", padding:20, borderRadius:10, width:300
  },
  textarea: { width:"100%", height:60, marginBottom:10 },
  productsGrid: { display:"flex", flexWrap:"wrap", gap:10, justifyContent:"center" },
  prodImg: { width:80, height:80, borderRadius:10, objectFit:"cover" }
};
