// Marketplace.js

import React, { useState, useEffect } from "react";
import {
  db,
  storage
} from "../firebase";
import {
  ref,
  push,
  onValue,
  update,
  remove
} from "firebase/database";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "firebase/storage";
import { getAuth } from "firebase/auth";
import SendPrivateMessage from "../components/SendPrivateMessage";

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
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [expandedComments, setExpandedComments] = useState({});
  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    const productRef = ref(db, "products");
    onValue(productRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const items = Object.entries(data).map(([id, val]) => ({
          id,
          ...val,
          likes: val.likes || 0,
          dislikes: val.dislikes || 0,
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

    setUploading(true);
    try {
      const imgRef = storageRef(storage, `marketplace/${Date.now()}-${image.name}`);
      await uploadBytes(imgRef, image);
      const url = await getDownloadURL(imgRef);

      const user = auth.currentUser;
      if (!user) return alert("Please login to post products.");

      await push(ref(db, "products"), {
        title,
        description,
        price,
        category,
        image: url,
        imagePath: imgRef.fullPath,
        time: new Date().toLocaleString(),
        likes: 0,
        dislikes: 0,
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

  const handleLike = (id, delta) => {
    const field = delta > 0 ? "likes" : "dislikes";
    const prodRef = ref(db, `products/${id}`);
    const product = products.find((p) => p.id === id);
    if (!product) return;
    update(prodRef, { [field]: product[field] + 1 });
  };

  const handleComment = (id) => {
    const text = commentInputs[id];
    if (!text) return;
    push(ref(db, `products/${id}/comments`), text);
    setCommentInputs({ ...commentInputs, [id]: "" });
  };

  const handleLongPress = (product) => {
    if (user?.uid !== product.ownerUID) return;
    if (!window.confirm("Delete this product?")) return;

    // Delete image from Firebase Storage
    if (product.imagePath) {
      const imgRef = storageRef(storage, product.imagePath);
      deleteObject(imgRef).catch(() => {});
    }

    // Delete from DB
    remove(ref(db, `products/${product.id}`));
  };

  const toggleComments = (id) => {
    setExpandedComments((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const filtered = products.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
  );

  const isDark = darkMode;

  return (
    <div style={{ background: isDark ? "#000" : "#fff", color: isDark ? "#fff" : "#000", ...pageStyle }}>
      <button onClick={() => setDarkMode(!darkMode)} style={toggleBtnStyle(isDark)}>
        {isDark ? "☀️" : "🌙"}
      </button>

      <div style={headerStyle}>
        {"AFRIBASE MARKETPLACE".split(" ").map((w, i) => (
          <span key={i} style={{ margin: "0 6px" }}>
            {w.split("").map((c, j) => (
              <span key={j} style={letterStyle}>
                {c}
              </span>
            ))}
          </span>
        ))}
      </div>

      <input
        style={{ ...searchInput, background: isDark ? "#1f1f1f" : "#fff", color: isDark ? "#fff" : "#000" }}
        placeholder="🔍 Search products..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Form */}
      <div style={formStyle}>
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle(isDark)} disabled={uploading} />
        <input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} style={inputStyle(isDark)} disabled={uploading} />
        <input placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} style={inputStyle(isDark)} disabled={uploading} />
        <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle(isDark)} disabled={uploading}>
          <option value="">Category</option>
          <option>📱 Electronics</option>
          <option>👗 Clothing</option>
          <option>🍲 Food</option>
          <option>🚗 Vehicles</option>
          <option>🔧 Other</option>
        </select>
        <input type="file" onChange={(e) => setImage(e.target.files[0])} disabled={uploading} />
        <button style={buttonStyle} onClick={handlePost} disabled={uploading}>
          {uploading ? "Uploading..." : "📤 Post"}
        </button>
      </div>

      {/* Product Grid */}
      <div style={productGrid}>
        {filtered.map((p) => (
          <div key={p.id} style={cardStyle(isDark)}>
            <img
              src={p.image}
              alt={p.title}
              style={imgStyle}
              onClick={() => setModal(p)}
              onContextMenu={(e) => {
                e.preventDefault();
                handleLongPress(p);
              }}
            />
            <h3>{p.title}</h3>
            <p>{p.description}</p>
            <strong style={{ color: "#00ffcc" }}>{p.price}</strong>
            <div style={{ fontSize: 12, color: isDark ? "#aaa" : "#555", marginBottom: 8 }}>{p.time}</div>

            {/* Likes / Dislikes */}
            <div style={socialRowStyle}>
              <span onClick={() => handleLike(p.id, 1)} style={emojiBtnStyle}>👍 {p.likes}</span>
              <span onClick={() => handleLike(p.id, -1)} style={emojiBtnStyle}>👎 {p.dislikes}</span>
              <span onClick={() => toggleComments(p.id)} style={{ marginLeft: 10, cursor: "pointer" }}>
                💬 {p.comments.length}
              </span>
            </div>

            {/* Comment Input */}
            {expandedComments[p.id] && (
              <div style={{ maxHeight: 100, overflowY: "auto", fontSize: 13 }}>
                {p.comments.map((c, i) => (
                  <div key={i} style={{ borderBottom: "1px solid #ccc", marginBottom: 4 }}>{c}</div>
                ))}
              </div>
            )}
            <input
              style={commentStyle(isDark)}
              placeholder="💬 Add comment..."
              value={commentInputs[p.id] || ""}
              onChange={(e) => setCommentInputs({ ...commentInputs, [p.id]: e.target.value })}
            />
            <button style={buttonStyle} onClick={() => handleComment(p.id)}>Post</button>

            <button
              onClick={() => {
                setSelectedUser({ uid: p.ownerUID, name: p.ownerName });
                setShowModal(true);
              }}
              style={{ backgroundColor: "#00ffcc", color: "#000", padding: "8px 14px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", marginTop: "10px" }}
            >
              Chat Seller
            </button>
          </div>
        ))}
      </div>

      {/* Modal */}
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

// ===== Styles (keep your current ones)
const pageStyle = { padding: 20, minHeight: "100vh", fontFamily: "Poppins", position: "relative" };
const toggleBtnStyle = (isDark) => ({ position: "absolute", top: 20, right: 20, fontSize: 20, background: isDark ? "#00ffcc" : "#121212", color: isDark ? "#000" : "#fff", padding: 10, borderRadius: 50, border: "none", boxShadow: "0 0 10px #00ffcc99", zIndex: 2 });
const headerStyle = { textAlign: "center", margin: "20px 0", fontWeight: "800", display: "flex", justifyContent: "center", flexWrap: "wrap" };
const letterStyle = { background: "linear-gradient(to top,#00ffcc,#000)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "flickerColor 2s infinite" };
const searchInput = { width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc", margin: "10px 0" };
const formStyle = { margin: "20px 0", display: "flex", flexDirection: "column", gap: 10 };
const inputStyle = (isDark) => ({ padding: 10, borderRadius: 8, border: "1px solid #ccc", background: isDark ? "#1f1f1f" : "#fff", color: isDark ? "#fff" : "#000" });
const buttonStyle = { backgroundColor: "#00cc88", color: "#fff", padding: "10px", border: "none", borderRadius: "10px", fontWeight: "bold", cursor: "pointer" };
const productGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 20, marginTop: 20 };
const cardStyle = (isDark) => ({ background: isDark ? "#111" : "#f9f9f9", borderRadius: 12, padding: 15, boxShadow: "0 0 8px rgba(0,0,0,0.2)" });
const imgStyle = { width: "100%", borderRadius: 10, cursor: "pointer" };
const socialRowStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 };
const emojiBtnStyle = { cursor: "pointer", marginRight: 10 };
const commentStyle = (isDark) => ({ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc", background: isDark ? "#222" : "#fff", color: isDark ? "#fff" : "#000", marginTop: 10 });
const modalOverlay = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 };
const modalContent = { background: "#fff", padding: 20, borderRadius: 10, maxWidth: 400, width: "90%", textAlign: "center" };
const modalImage = { width: "100%", borderRadius: 10, marginBottom: 10 };
const waBtnStyle = { display: "inline-block", marginTop: 10, backgroundColor: "#25D366", color: "#fff", padding: "10px 20px", borderRadius: 8, textDecoration: "none" };
