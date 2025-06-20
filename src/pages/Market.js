import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref, push, onValue, update, remove } from "firebase/database";

const IMGBB_API_KEY = "30df4aa05f1af3b3b58ee8a74639e5cf";

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
  const [likedProducts, setLikedProducts] = useState({}); // To track likes toggle per user/session

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
            ? Object.entries(val.comments).map(([cid, c]) => ({ id: cid, text: c }))
            : []
        }));
        setProducts(items.reverse());
      }
    });
  }, []);

  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });

  const handlePost = async () => {
    if (!title || !description || !price || !category || !image) {
      return alert("Please fill in all fields.");
    }
    try {
      const base64Image = await toBase64(image);
      const formData = new FormData();
      formData.append("image", base64Image.split(",")[1]);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!data.success) throw new Error("Image upload failed");
      const imageUrl = data.data.url;
      // Optionally save delete_url if you want to support deletion from imgbb later
      push(ref(db, "products"), {
        title,
        description,
        price,
        category,
        image: imageUrl,
        time: new Date().toLocaleString(),
        likes: 0,
        dislikes: 0,
      });
      setTitle("");
      setDescription("");
      setPrice("");
      setCategory("");
      setImage(null);
      alert("✅ Product posted!");
    } catch (error) {
      console.error(error);
      alert("Image upload or post failed. Try again.");
    }
  };

  const handleLike = (id) => {
    const prodRef = ref(db, `products/${id}`);
    const liked = likedProducts[id];
    const product = products.find((p) => p.id === id);
    if (!product) return;

    if (liked) {
      // Remove like
      update(prodRef, { likes: Math.max(product.likes - 1, 0) });
      setLikedProducts((prev) => ({ ...prev, [id]: false }));
    } else {
      // Add like
      update(prodRef, { likes: product.likes + 1 });
      setLikedProducts((prev) => ({ ...prev, [id]: true }));
    }
  };

  const handleDislike = (id) => {
    const prodRef = ref(db, `products/${id}`);
    const disliked = likedProducts[`dislike_${id}`];
    const product = products.find((p) => p.id === id);
    if (!product) return;

    if (disliked) {
      update(prodRef, { dislikes: Math.max(product.dislikes - 1, 0) });
      setLikedProducts((prev) => ({ ...prev, [`dislike_${id}`]: false }));
    } else {
      update(prodRef, { dislikes: product.dislikes + 1 });
      setLikedProducts((prev) => ({ ...prev, [`dislike_${id}`]: true }));
    }
  };

  const handleComment = (productId) => {
    const text = commentInputs[productId];
    if (!text) return;
    push(ref(db, `products/${productId}/comments`), text);
    setCommentInputs({ ...commentInputs, [productId]: "" });
  };

  const handleDeleteComment = (productId, commentId) => {
    if (window.confirm("❌ Delete this comment?")) {
      remove(ref(db, `products/${productId}/comments/${commentId}`));
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm("🗑️ Delete this product?")) return;
    try {
      await remove(ref(db, `products/${id}`));
      alert("✅ Product deleted!");
    } catch (err) {
      console.error(err);
      alert("❌ Failed to delete product.");
    }
  };

  // Long press detection logic
  let pressTimer = null;

  const handlePressStart = (id) => {
    pressTimer = setTimeout(() => {
      handleDeleteProduct(id);
    }, 800); // 800ms long press
  };

  const handlePressEnd = () => {
    clearTimeout(pressTimer);
  };

  const filtered = products.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
  );

  const isDark = darkMode;

  return (
    <div
      style={{
        ...pageStyle,
        background: isDark ? "#121212" : "#f4f4f4",
        color: isDark ? "#fff" : "#000",
      }}
    >
      <button style={toggleBtnStyle(isDark)} onClick={() => setDarkMode(!darkMode)}>
        {isDark ? "🌙" : "🌞"}
      </button>

      <h2 style={headerStyle}>
        {"AFRIBASE MARKETPLACE".split(" ").map((w, i) => (
          <span key={i} style={{ marginRight: "10px" }}>
            {w.split("").map((c, j) => (
              <span key={j} style={{ ...letterStyle, animationDelay: `${(i + j) * 0.05}s` }}>
                {c}
              </span>
            ))}
          </span>
        ))}
      </h2>

      <input
        style={{ ...searchInput, background: isDark ? "#1f1f1f" : "#fff", color: isDark ? "#fff" : "#000" }}
        placeholder="🔍 Search products..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div style={formStyle}>
        <input style={inputStyle(isDark)} placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea
          style={textStyle(isDark)}
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <input style={inputStyle(isDark)} placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} />
        <select style={inputStyle(isDark)} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Category</option>
          <option value="Electronics">📱 Electronics</option>
          <option value="Clothing">👗 Clothing</option>
          <option value="Food">🍲 Food</option>
          <option value="Vehicles">🚗 Vehicles</option>
          <option value="Other">❓ Other</option>
        </select>
        <input type="file" onChange={(e) => setImage(e.target.files[0])} />
        <button style={buttonStyle} onClick={handlePost}>
          📝 Post
        </button>
      </div>

      <div style={productGrid}>
        {filtered.map((p) => (
          <div
            key={p.id}
            style={{ ...cardStyle(isDark) }}
            onMouseDown={() => handlePressStart(p.id)}
            onMouseUp={handlePressEnd}
            onTouchStart={() => handlePressStart(p.id)}
            onTouchEnd={handlePressEnd}
          >
            <img src={p.image} style={imgStyle} onClick={() => setModal(p)} alt={p.title} />
            <h3>{p.title}</h3>
            <p style={{ flexGrow: 1 }}>{p.description}</p>
            <strong style={{ color: "#00ffcc" }}>{p.price}</strong>
            <div style={categoryStyle}>📂 {p.category}</div>
            <div style={{ fontSize: "12px", color: isDark ? "#aaa" : "#555", marginBottom: "8px" }}>{p.time}</div>
            <div style={socialRowStyle}>
              <div>
                <span
                  onClick={() => handleLike(p.id)}
                  style={{ ...emojiBtnStyle, color: likedProducts[p.id] ? "#00ffcc" : undefined }}
                >
                  👍 {p.likes}
                </span>
                <span
                  onClick={() => handleDislike(p.id)}
                  style={{ ...emojiBtnStyle, color: likedProducts[`dislike_${p.id}`] ? "#ff6347" : undefined }}
                >
                  👎 {p.dislikes}
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
            {p.comments.map((c) => (
              <div
                key={c.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: isDark ? "#222" : "#eee",
                  borderRadius: "6px",
                  padding: "4px 8px",
                  marginTop: 6,
                  fontSize: 14,
                }}
              >
                <span>{c.text}</span>
                <button
                  onClick={() => handleDeleteComment(p.id, c.id)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "red",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontSize: 16,
                  }}
                  title="Delete comment"
                >
                  ❌
                </button>
              </div>
            ))}
            <input
              style={commentStyle(isDark)}
              placeholder="💬 Add comment..."
              value={commentInputs[p.id] || ""}
              onChange={(e) => setCommentInputs({ ...commentInputs, [p.id]: e.target.value })}
            />
            <button style={buttonStyle} onClick={() => handleComment(p.id)}>
              Post
            </button>
          </div>
        ))}
      </div>

      {modal && (
        <div style={modalOverlay} onClick={() => setModal(null)}>
          <div style={modalContent}>
            <img src={modal.image} style={modalImage} alt={modal.title} />
            <h2>{modal.title}</h2>
            <p>{modal.description}</p>
            <p>📂 {modal.category}</p>
            <p style={{ color: "#00ffcc", fontWeight: "bold" }}>{modal.price}</p>
            <p style={{ fontSize: "12px", color: "#aaa" }}>{modal.time}</p>
            <a href={`https://wa.me/?text=Hi I'm interested`} style={waBtnStyle}>
              💬 WhatsApp
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// Styles
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
const headerStyle = {
  textAlign: "center",
  margin: "20px 0",
  fontWeight: "800",
  display: "flex",
  justifyContent: "center",
  flexWrap: "wrap",
};
const letterStyle = {
  background: "linear-gradient(to top,#00ffcc,#000)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  animation : "flickerColor 2s infinite",
};
const searchInput = {
  width: "100%",
  maxWidth: 400,
  display: "block",
  margin: "0 auto 20px",
  padding: "10px",
  border: "none",
  borderRadius: 8,
  fontSize: 16,
};
const formStyle = { display: "flex", flexDirection: "column", gap: 10, maxWidth: 400, margin: "0 auto 20px" };
const inputStyle = (isDark) => ({
  padding: 12,
  borderRadius: 8,
  border: "none",
  fontSize: 16,
  background: isDark ? "#1f1f1f" : "#fff",
  color: isDark ? "#fff" : "#000",
});
const textStyle = inputStyle;
const buttonStyle = {
  padding: 10,
  backgroundColor: "#00ffcc",
  color: "#000",
  border: "none",
  borderRadius: 6,
  fontSize: 14,
  cursor: "pointer",
  marginTop: 5,
};
const productGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))",
  gap: 16,
};
const cardStyle = (isDark) => ({
  padding: 12,
  borderRadius: 10,
  boxShadow: "0 0 10px #00ffcc30",
  display: "flex",
  flexDirection: "column",
  background: isDark ? "#1e1e1e" : "#fff",
  color: isDark ? "#fff" : "#000",
});
const imgStyle = {
  width: "100%",
  height: 140,
  objectFit: "cover",
  borderRadius: 8,
  marginBottom: 10,
  cursor: "pointer",
};
const categoryStyle = { fontSize: 14, color: "#00ffcc", margin: "5px 0" };
const socialRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  background: "rgba(255,255,255,0.06)",
  padding: "8px",
  borderRadius: 8,
  marginTop: 10,
};
const emojiBtnStyle = { cursor: "pointer", marginRight: 10, fontSize: 16 };
const waBtnStyle = {
  backgroundColor: "#25D366",
  color: "#fff",
  padding: "6px 12px",
  borderRadius: 20,
  textDecoration: "none",
  fontSize: 14,
  fontWeight: "500",
};
const commentStyle = (isDark) => ({ ...inputStyle(isDark), marginTop: 10 });
const modalOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0,0,0,0.7)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 10,
};
const modalContent = {
  background: "#1e1e1e",
  padding: 20,
  borderRadius: 10,
  maxWidth: "90%",
  maxHeight: "90%",
  color: "#fff",
  overflowY: "auto",
  textAlign: "center",
};
const modalImage = {
  width: "100%",
  maxHeight: 300,
  objectFit: "contain",
  borderRadius: 8,
  marginBottom: 20,
};
