import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref, push, onValue, update } from "firebase/database";

// Replace with your actual IMGBB API key
const IMGBB_KEY = "30df4aa05f1af3b3b58ee8a74639e5cf";
const currentUserId = "demoUser123"; // Replace later with real auth UID

export default function Marketplace() {
  const [products, setProducts] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [search, setSearch] = useState("");
  const [darkMode, setDarkMode] = useState(true);
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
          comments: val.comments ? Object.values(val.comments) : [],
        }));
        setProducts(items.reverse());
      }
    });
  }, []);

  const handlePost = async () => {
    if (!title || !description || !price || !category || !imageFile) {
      return alert("Fill all fields");
    }

    // Upload to IMGBB
    const form = new FormData();
    form.append("image", imageFile);

    try {
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, {
        method: "POST",
        body: form,
      });
      const result = await res.json();
      const url = result.data.url;

      // Now push to Firebase
      push(ref(db, "products"), {
        title,
        description,
        price,
        category,
        image: url,
        time: new Date().toLocaleString(),
        likes: 0,
        dislikes: 0,
        userId: currentUserId
      });

      setTitle("");
      setDescription("");
      setPrice("");
      setCategory("");
      setImageFile(null);

    } catch (err) {
      alert("Image upload failed: " + err.message);
    }
  };

  const handleLike = (id, delta) => {
    const field = delta > 0 ? "likes" : "dislikes";
    const prodRef = ref(db, `products/${id}`);
    update(prodRef, {
      [field]: products.find((p) => p.id === id)[field] + 1,
    });
  };

  const handleComment = (id) => {
    const text = commentInputs[id];
    if (!text) return;
    push(ref(db, `products/${id}/comments`), text);
    setCommentInputs({ ...commentInputs, [id]: "" });
  };

  const filtered = products.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
  );

  const isDark = darkMode;

  return (
    <div style={{ ...pageStyle, background: isDark ? "#121212" : "#f4f4f4", color: isDark ? "#fff" : "#000" }}>
      <button style={toggleBtnStyle(isDark)} onClick={() => setDarkMode(!darkMode)}>
        {isDark ? "☀️" : "🌙"}
      </button>

      <h2 style={headerStyle}>
        {"AFRIBASE MARKETPLACE".split(" ").map((w, i) =>
          <span key={i} style={{ marginRight: "10px" }}>
            {w.split("").map((c, j) => (
              <span key={j} style={{ ...letterStyle, animationDelay: `${(i + j) * 0.05}s` }}>
                {c}
              </span>
            ))}
          </span>
        )}
      </h2>

      <input
        style={{ ...searchInput, background: isDark ? "#1f1f1f" : "#fff", color: isDark ? "#fff" : "#000" }}
        placeholder="🔍 Search products..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div style={formStyle}>
        <input style={inputStyle(isDark)} placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea style={textStyle(isDark)} placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <input style={inputStyle(isDark)} placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} />
        <select style={inputStyle(isDark)} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Category</option>
          <option value="Electronics">📱 Electronics</option>
          <option value="Clothing">👗 Clothing</option>
          <option value="Food">🍲 Food</option>
          <option value="Vehicles">🚗 Vehicles</option>
          <option value="Other">🔧 Other</option>
        </select>
        <input type="file" onChange={(e) => setImageFile(e.target.files[0])} />
        <button style={buttonStyle} onClick={handlePost}>📤 Post</button>
      </div>

      <div style={productGrid}>
        {filtered.map((p) => (
          <div key={p.id} style={{ ...cardStyle(isDark) }}>
            <img src={p.image} style={imgStyle} onClick={() => setModal(p)} />
            <h3>{p.title}</h3>
            <p style={{ flexGrow: 1 }}>{p.description}</p>
            <strong style={{ color: "#00ffcc" }}>{p.price}</strong>
            <div style={categoryStyle}>📂 {p.category}</div>
            <div style={{ fontSize: "12px", color: isDark ? "#aaa" : "#555", marginBottom: "8px" }}>{p.time}</div>

            <div style={socialRowStyle}>
              <div>
                <span onClick={() => handleLike(p.id, 1)} style={emojiBtnStyle}>👍 {p.likes}</span>
                <span onClick={() => handleLike(p.id, -1)} style={emojiBtnStyle}>👎 {p.dislikes}</span>
              </div>
              <a href={`https://wa.me/?text=Hi I'm interested in your ${encodeURIComponent(p.title)}`} target="_blank" rel="noopener noreferrer" style={waBtnStyle}>
                💬 WhatsApp
              </a>
            </div>

            <input style={commentStyle(isDark)} placeholder="💬 Add comment..." value={commentInputs[p.id] || ""} onChange={(e) => setCommentInputs({ ...commentInputs, [p.id]: e.target.value })} />
            <button style={buttonStyle} onClick={() => handleComment(p.id)}>Post</button>
          </div>
        ))}
      </div>

      {/* modal and styles unchanged */}
    </div>
  );
}

// Styles & helpers (unchanged)...
