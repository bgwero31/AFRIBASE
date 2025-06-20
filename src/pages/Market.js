import React, { useState, useEffect } from "react";
import { db, storage } from "../firebase";
import {
  ref, push, onValue, update, remove
} from "firebase/database";
import {
  ref as storageRef, uploadBytes, getDownloadURL, deleteObject
} from "firebase/storage";

// Replace with real auth user later
const currentUserId = "demoUser123";

export default function Marketplace() {
  const [products, setProducts] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [image, setImage] = useState(null);
  const [search, setSearch] = useState("");
  const [darkMode, setDarkMode] = useState(false); // ✅ Light mode by default
  const [modal, setModal] = useState(null);
  const [commentInputs, setCommentInputs] = useState({});

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
          comments: val.comments
            ? Object.entries(val.comments).map(([cid, c]) => ({
                id: cid,
                text: c.text,
                userId: c.userId,
                timestamp: c.timestamp
              }))
            : []
        }));
        setProducts(items.reverse());
      }
    });
  }, []);

  const handlePost = async () => {
    if (!title || !description || !price || !category || !image) {
      alert("Fill all fields");
      return;
    }

    const imgRef = storageRef(storage, `marketplace/${Date.now()}-${image.name}`);
    await uploadBytes(imgRef, image);
    const url = await getDownloadURL(imgRef);

    push(ref(db, "products"), {
      title,
      description,
      price,
      category,
      image: url,
      imagePath: imgRef.fullPath,
      time: new Date().toLocaleString(),
      likes: 0,
      dislikes: 0,
      userId: currentUserId
    });

    setTitle(""); setDescription(""); setPrice(""); setCategory(""); setImage(null);
  };

  const handleLike = (id, delta) => {
    const field = delta > 0 ? "likes" : "dislikes";
    const prodRef = ref(db, `products/${id}`);
    update(prodRef, {
      [field]: products.find(p => p.id === id)[field] + 1
    });
  };

  const handleComment = (id) => {
    const text = commentInputs[id];
    if (!text) return;
    push(ref(db, `products/${id}/comments`), {
      text,
      userId: currentUserId,
      timestamp: Date.now()
    });
    setCommentInputs({ ...commentInputs, [id]: "" });
  };

  const handleDeleteComment = (pid, cid) => {
    if (window.confirm("Delete this comment?")) {
      remove(ref(db, `products/${pid}/comments/${cid}`));
    }
  };

  const handleDeleteProduct = async (p) => {
    if (window.confirm("Delete this product?")) {
      await deleteObject(storageRef(storage, p.imagePath));
      await remove(ref(db, `products/${p.id}`));
    }
  };

  const filtered = products.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase())
  );

  const isDark = darkMode;

  return (
    <div style={{
      padding: 20,
      background: isDark ? "#121212" : "#f4f4f4",
      color: isDark ? "#fff" : "#000",
      minHeight: "100vh",
      fontFamily: "Poppins"
    }}>
      <button onClick={() => setDarkMode(!darkMode)} style={{
        float: "right", padding: 10, borderRadius: 20,
        background: isDark ? "#00ffcc" : "#121212",
        color: isDark ? "#000" : "#fff", border: "none"
      }}>
        {isDark ? "☀️" : "🌙"}
      </button>

      <h2 style={{
        textAlign: "center",
        marginBottom: 20,
        fontWeight: "bold",
        background: "linear-gradient(to right, green, black)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent"
      }}>
        AFRIBASE MARKETPLACE
      </h2>

      <input
        placeholder="🔍 Search products..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          padding: 10, width: "100%", maxWidth: 400, margin: "10px auto",
          display: "block", borderRadius: 10, border: "1px solid #ccc"
        }}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 500, margin: "auto" }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
        <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price" />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Category</option>
          <option value="Electronics">📱 Electronics</option>
          <option value="Clothing">👗 Clothing</option>
          <option value="Food">🍲 Food</option>
          <option value="Vehicles">🚗 Vehicles</option>
          <option value="Other">🔧 Other</option>
        </select>
        <input type="file" onChange={(e) => setImage(e.target.files[0])} />
        <button onClick={handlePost} style={{ background: "#00ffcc", padding: 10, borderRadius: 6, border: "none" }}>📤 Post</button>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
        gap: 16,
        marginTop: 30
      }}>
        {filtered.length === 0 && <p style={{ textAlign: "center" }}>No products found</p>}
        {filtered.map(p => (
          <div key={p.id} style={{
            background: isDark ? "#1e1e1e" : "#fff",
            color: isDark ? "#fff" : "#000",
            padding: 12,
            borderRadius: 10,
            boxShadow: "0 0 6px rgba(0,0,0,0.1)"
          }}>
            <img src={p.image} style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 6, cursor: "pointer" }} onClick={() => setModal(p)} />
            <h4>{p.title}</h4>
            <p>{p.description}</p>
            <strong style={{ color: "#00ffcc" }}>${p.price}</strong>
            <p style={{ fontSize: 12, color: isDark ? "#aaa" : "#555" }}>{p.category}</p>
            <p style={{ fontSize: 11, marginBottom: 5 }}>{p.time}</p>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
              <span onClick={() => handleLike(p.id, 1)}>👍 {p.likes}</span>
              <span onClick={() => handleLike(p.id, -1)}>👎 {p.dislikes}</span>
              <a href={`https://wa.me/?text=Hi I'm interested in your ${p.title}`} target="_blank" rel="noopener noreferrer">💬 WhatsApp</a>
            </div>
            {p.userId === currentUserId && (
              <button onClick={() => handleDeleteProduct(p)} style={{
                background: "#ff4444", color: "#fff",
                border: "none", padding: "5px 10px", borderRadius: 5,
                marginTop: 6
              }}>🗑️ Delete</button>
            )}
            <div style={{ marginTop: 10 }}>
              {p.comments.map(c => (
                <div key={c.id} style={{ fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>{c.text}</span>
                  {c.userId === currentUserId && (
                    <button onClick={() => handleDeleteComment(p.id, c.id)} style={{
                      background: "none", border: "none", color: "#f00", fontWeight: "bold", cursor: "pointer"
                    }}>✖</button>
                  )}
                </div>
              ))}
              <input
                placeholder="💬 Add comment..."
                value={commentInputs[p.id] || ""}
                onChange={(e) => setCommentInputs({ ...commentInputs, [p.id]: e.target.value })}
                style={{ width: "100%", marginTop: 4 }}
              />
              <button onClick={() => handleComment(p.id)} style={{ ...buttonStyle, width: "100%" }}>Post</button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "#000000aa", display: "flex", justifyContent: "center", alignItems: "center"
        }} onClick={() => setModal(null)}>
          <div style={{
            background: "#fff", padding: 20, maxWidth: 400,
            borderRadius: 10, textAlign: "center"
          }}>
            <img src={modal.image} alt="" style={{ width: "100%", borderRadius: 10, marginBottom: 10 }} />
            <h2>{modal.title}</h2>
            <p>{modal.description}</p>
            <strong>${modal.price}</strong>
            <p>{modal.category}</p>
            <p style={{ fontSize: 12 }}>{modal.time}</p>
            <a href={`https://wa.me/?text=Hi I'm interested in your ${modal.title}`} target="_blank" rel="noopener noreferrer" style={{
              background: "#25D366", padding: "8px 20px", borderRadius: 20,
              color: "#fff", textDecoration: "none", display: "inline-block", marginTop: 10
            }}>💬 Contact on WhatsApp</a>
          </div>
        </div>
      )}
    </div>
  );
}

const buttonStyle = {
  backgroundColor: "#00ffcc",
  color: "#000",
  border: "none",
  borderRadius: 6,
  padding: "8px",
  cursor: "pointer",
  fontWeight: "bold"
};
