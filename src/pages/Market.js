// Marketplace.js
import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref, push, onValue, update, remove } from "firebase/database";
import { getAuth } from "firebase/auth";
import SendPrivateMessage from "../components/SendPrivateMessage";

const imgbbKey = "30df4aa05f1af3b3b58ee8a74639e5cf";

export default function Marketplace() {
  const [products, setProducts] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [image, setImage] = useState(null);
  const [search, setSearch] = useState("");
  const [darkMode, setDarkMode] = useState(true);
  const [modal, setModal] = useState(null);
  const [commentInputs, setCommentInputs] = useState({});
  const [showComments, setShowComments] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [uploading, setUploading] = useState(false);
  const auth = getAuth();

  useEffect(() => {
    const productRef = ref(db, "products");
    onValue(productRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const items = Object.entries(data).map(([id, val]) => ({
          id,
          ...val,
          likes: val.likes || [],
          dislikes: val.dislikes || [],
          comments: val.comments ? Object.values(val.comments) : [],
        }));
        setProducts(items.reverse());
      }
    });
  }, []);

  const handlePost = async () => {
    if (!title || !description || !price || !category || !image) {
      return alert("Fill all fields");
    }

    const user = auth.currentUser;
    if (!user) return alert("Please login to post products.");
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("image", image);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      const url = data.data.url;

      await push(ref(db, "products"), {
        title,
        description,
        price,
        category,
        image: url,
        time: new Date().toLocaleString(),
        likes: [],
        dislikes: [],
        comments: [],
        ownerUID: user.uid,
        ownerName: user.displayName || "Unknown",
      });

      setTitle("");
      setDescription("");
      setPrice("");
      setCategory("");
      setImage(null);
    } catch (err) {
      alert("Image upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleLike = (id) => {
    const user = auth.currentUser;
    if (!user) return;

    const prodRef = ref(db, `products/${id}`);
    const product = products.find((p) => p.id === id);
    if (!product) return;

    const liked = product.likes.includes(user.uid);
    const updatedLikes = liked
      ? product.likes.filter((uid) => uid !== user.uid)
      : [...product.likes, user.uid];

    update(prodRef, { likes: updatedLikes });
  };

  const handleDislike = (id) => {
    const user = auth.currentUser;
    if (!user) return;

    const prodRef = ref(db, `products/${id}`);
    const product = products.find((p) => p.id === id);
    if (!product) return;

    const disliked = product.dislikes.includes(user.uid);
    const updatedDislikes = disliked
      ? product.dislikes.filter((uid) => uid !== user.uid)
      : [...product.dislikes, user.uid];

    update(prodRef, { dislikes: updatedDislikes });
  };

  const handleComment = (id) => {
    const text = commentInputs[id];
    const user = auth.currentUser;
    if (!text || !user) return;

    const comment = {
      name: user.displayName || "User",
      text,
      timestamp: Date.now(),
    };

    push(ref(db, `products/${id}/comments`), comment);
    setCommentInputs({ ...commentInputs, [id]: "" });
  };

  const toggleShowComments = (id) => {
    setShowComments({ ...showComments, [id]: !showComments[id] });
  };

  const filtered = products.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
  );

  const isDark = darkMode;

  return (
    <div style={pageStyle}>
      <button onClick={() => setDarkMode(!darkMode)} style={toggleBtnStyle(isDark)}>
        {isDark ? "☀️" : "🌙"}
      </button>
      <h2 style={headerStyle}>
        {"AFRIBASE MARKETPLACE".split(" ").map((w, i) => (
          <span key={i} style={{ margin: "0 8px" }}>
            {w.split("").map((c, j) => (
              <span key={j} style={letterStyle}>
                {c}
              </span>
            ))}
          </span>
        ))}
      </h2>

      <input
        style={{
          ...searchInput,
          background: isDark ? "#1f1f1f" : "#fff",
          color: isDark ? "#fff" : "#000",
        }}
        placeholder="🔍 Search products..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div>
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <input placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Category</option>
          <option value="Electronics">📱 Electronics</option>
          <option value="Clothing">👗 Clothing</option>
          <option value="Food">🍲 Food</option>
          <option value="Vehicles">🚗 Vehicles</option>
          <option value="Other">🔧 Other</option>
        </select>
        <input type="file" onChange={(e) => setImage(e.target.files[0])} />
        <button onClick={handlePost} disabled={uploading}>
          {uploading ? "Uploading..." : "📤 Post"}
        </button>
      </div>

      <div style={productGrid}>
        {filtered.map((p) => (
          <div key={p.id} style={cardStyle(isDark)}>
            <img src={p.image} style={imgStyle} alt={p.title} onClick={() => setModal(p)} />
            <h3>{p.title}</h3>
            <p>{p.description}</p>
            <strong style={{ color: "#00ffcc" }}>{p.price}</strong>
            <div>📂 {p.category}</div>
            <div style={{ fontSize: "12px", color: isDark ? "#aaa" : "#555" }}>{p.time}</div>

            <div style={socialRowStyle}>
              <div>
                <span onClick={() => handleLike(p.id)} style={emojiBtnStyle}>
                  👍 {p.likes.length}
                </span>
                <span onClick={() => handleDislike(p.id)} style={emojiBtnStyle}>
                  👎 {p.dislikes.length}
                </span>
              </div>
              <a
                href={`https://wa.me/?text=Hi I'm interested in your ${encodeURIComponent(p.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={waBtnStyle}
              >
                💬 WhatsApp
              </a>
            </div>

            <div>
              <button onClick={() => toggleShowComments(p.id)}>
                💬 Comments ({p.comments.length})
              </button>
              {showComments[p.id] && (
                <div style={{ maxHeight: "100px", overflowY: "auto", marginTop: "5px" }}>
                  {p.comments.map((c, i) => (
                    <p key={i}>
                      <strong>{c.name}</strong>: {c.text}
                    </p>
                  ))}
                </div>
              )}
              <input
                style={commentStyle(isDark)}
                placeholder="Add a comment..."
                value={commentInputs[p.id] || ""}
                onChange={(e) => setCommentInputs({ ...commentInputs, [p.id]: e.target.value })}
              />
              <button style={buttonStyle} onClick={() => handleComment(p.id)}>
                Post
              </button>
            </div>

            <button
              onClick={() => {
                setSelectedUser({ uid: p.ownerUID, name: p.ownerName });
                setShowModal(true);
              }}
              style={{
                backgroundColor: "#00ffcc",
                color: "#000",
                padding: "8px 14px",
                borderRadius: "6px",
                fontWeight: "bold",
                cursor: "pointer",
                marginTop: "10px",
              }}
            >
              Chat Seller
            </button>
          </div>
        ))}
      </div>

      {modal && (
        <div style={modalOverlay} onClick={() => setModal(null)}>
          <div style={modalContent} onClick={(e) => e.stopPropagation()}>
            <img src={modal.image} style={modalImage} alt={modal.title} />
            <h2>{modal.title}</h2>
            <p>{modal.description}</p>
            <p>📂 {modal.category}</p>
            <p style={{ color: "#00ffcc", fontWeight: "bold" }}>{modal.price}</p>
            <p style={{ fontSize: "12px", color: "#aaa" }}>{modal.time}</p>
            <a
              href={`https://wa.me/?text=Hi I'm interested in your ${encodeURIComponent(modal.title)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={waBtnStyle}
            >
              💬 WhatsApp
            </a>
          </div>
        </div>
      )}

      {showModal && selectedUser && (
        <SendPrivateMessage
          recipientUID={selectedUser.uid}
          recipientName={selectedUser.name}
          onClose={() => setShowModal(false)}
          productId={null}
        />
      )}
    </div>
  );
}

// Style objects below (same as your original setup)
const toggleBtnStyle = (isDark) => ({
  position: "absolute",
  top: 20,
  right: 20,
  fontSize: 20,
  background: isDark ? "#00ffcc" : "#121212",
  color: isDark ? "#000" : "#fff",
  padding: 10,
  borderRadius: 50,
  border: "none",
  boxShadow: "0 0 10px #00ffcc99",
  zIndex: 2,
});

const pageStyle = { padding: 20, minHeight: "100vh", fontFamily: "Poppins", position: "relative" };
const headerStyle = { textAlign: "center", margin: "20px 0", fontWeight: "800", display: "flex", justifyContent: "center", flexWrap: "wrap" };
const letterStyle = { background: "linear-gradient(to top,#00ffcc,#000)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "flickerColor 2s infinite" };
const searchInput = { width: "100%", padding: 10, fontSize: 16, borderRadius: 10, margin: "10px 0", border: "1px solid #ccc" };
const productGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 20, marginTop: 20 };
const cardStyle = (isDark) => ({ background: isDark ? "#121212" : "#fff", padding: 15, borderRadius: 15, boxShadow: "0 2px 8px rgba(0,0,0,0.2)" });
const imgStyle = { width: "100%", height: "200px", objectFit: "cover", borderRadius: "10px", cursor: "pointer" };
const commentStyle = (isDark) => ({ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #ccc", marginTop: 5, background: isDark ? "#222" : "#fff", color: isDark ? "#fff" : "#000" });
const emojiBtnStyle = { cursor: "pointer", marginRight: 10 };
const waBtnStyle = { textDecoration: "none", fontWeight: "bold", background: "#25D366", color: "#fff", padding: "6px 10px", borderRadius: "6px", marginLeft: 10 };
const buttonStyle = { background: "#00cc88", color: "#fff", padding: "6px 12px", borderRadius: 6, border: "none", cursor: "pointer", marginTop: 5 };
const socialRowStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 };
const modalOverlay = { position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center" };
const modalContent = { background: "#fff", padding: 20, borderRadius: 10, width: "90%", maxWidth: 400, textAlign: "center" };
const modalImage = { width: "100%", height: "250px", objectFit: "cover", borderRadius: 10 };
