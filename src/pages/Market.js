import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref, push, onValue, update, remove } from "firebase/database";
import { getAuth } from "firebase/auth";

const IMGBB_API_KEY = "30df4aa05f1af3b3b58ee8a74639e5cf";

export default function Marketplace() {
  const auth = getAuth();
  const user = auth.currentUser;

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
  const [likedProducts, setLikedProducts] = useState({});

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
                ...c,
              }))
            : [],
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

      push(ref(db, "products"), {
        title,
        description,
        price,
        category,
        image: imageUrl,
        time: new Date().toLocaleString(),
        likes: 0,
        dislikes: 0,
        userName: user?.displayName || "Unknown User",
        userPhoto: user?.photoURL || "",
        uid: user?.uid || "",
      });

      setTitle("");
      setDescription("");
      setPrice("");
      setCategory("");
      setImage(null);
      alert("✅ Product posted!");
    } catch (error) {
      console.error(error);
      alert("Image upload or post failed.");
    }
  };
  const handleLike = (id) => {
    const prodRef = ref(db, `products/${id}`);
    const liked = likedProducts[id];
    const product = products.find((p) => p.id === id);
    if (!product) return;

    if (liked) {
      update(prodRef, { likes: Math.max(product.likes - 1, 0) });
      setLikedProducts((prev) => ({ ...prev, [id]: false }));
    } else {
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
    push(ref(db, `products/${productId}/comments`), {
      text,
      author: user?.displayName || "User",
    });
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

  let pressTimer = null;
  const handlePressStart = (id) => {
    pressTimer = setTimeout(() => {
      if (user?.uid === products.find(p => p.id === id)?.uid) {
        handleDeleteProduct(id);
      } else {
        alert("You can only delete your own products.");
      }
    }, 800);
  };
  const handlePressEnd = () => clearTimeout(pressTimer);

  const filtered = products.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ ...pageStyle, background: isDark ? "#121212" : "#f4f4f4", color: isDark ? "#fff" : "#000" }}>
      <button style={toggleBtnStyle(isDark)} onClick={() => setDarkMode(!darkMode)}>
        {isDark ? "🌙" : "☀️"}
      </button>

      <h2 style={headerStyle}>
        {"AFRIBASE MARKETPLACE".split(" ").map((w, i) => (
          <span key={i} style={{ marginRight: "10px" }}>
            {w.split("").map((c, j) => (
              <span key={j} style={{ ...letterStyle, animationDelay: `${(i + j) * 0.05}s` }}>{c}</span>
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

      {/* FORM */}
      {/* -- OMITTED FORM (already added in part 1) -- */}

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
            <p>{p.description}</p>
            <strong style={{ color: "#00ffcc" }}>{p.price}</strong>
            <div style={categoryStyle}>📂 {p.category}</div>
            <div style={{ fontSize: "12px", color: isDark ? "#aaa" : "#555", marginBottom: "6px" }}>{p.time}</div>

            {p.userName && (
              <div style={{ display: "flex", alignItems: "center", marginTop: 5 }}>
                {p.userPhoto && <img src={p.userPhoto} alt="u" style={{ width: 24, height: 24, borderRadius: "50%", marginRight: 6 }} />}
                <span style={{ fontSize: 13 }}>{p.userName}</span>
              </div>
            )}

            <div style={socialRowStyle}>
              <div>
                <span onClick={() => handleLike(p.id)} style={emojiBtnStyle}>👍 {p.likes}</span>
                <span onClick={() => handleDislike(p.id)} style={emojiBtnStyle}>👎 {p.dislikes}</span>
              </div>
              <button
                onClick={() => {
                  window.location.href = `/chat?to=${p.uid}`;
                }}
                style={waBtnStyle}
              >
                💬 Chat Seller
              </button>
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
