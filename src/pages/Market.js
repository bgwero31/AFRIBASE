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
          likesByUser: val.likesByUser || {},
          dislikesByUser: val.dislikesByUser || {},
          comments: val.comments
            ? Object.entries(val.comments).map(([cid, comment]) => ({ id: cid, ...comment }))
            : [],
        }));
        setProducts(items.reverse());
      } else {
        setProducts([]);
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
    if (!user) return alert("You must be signed in to post.");
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
        userId: user.uid,
        username: user.displayName || "Anonymous",
        userImage: user.photoURL || "",
        likesByUser: {},
        dislikesByUser: {},
        comments: {},
      });

      setTitle("");
      setDescription("");
      setPrice("");
      setCategory("");
      setImage(null);
      alert("✔️ Product posted!");
    } catch (error) {
      console.error(error);
      alert("Image upload or post failed. Try again.");
    }
  };

  const handleLike = (productId) => {
    if (!user) return alert("You must be signed in to like.");
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    const prodRef = ref(db, `products/${productId}`);

    const userId = user.uid;
    const hasLiked = prod.likesByUser[userId];
    const hasDisliked = prod.dislikesByUser[userId];

    const updates = {};

    if (hasLiked) {
      updates["likes"] = prod.likes - 1;
      updates[`likesByUser/${userId}`] = null;
    } else {
      updates["likes"] = prod.likes + 1;
      updates[`likesByUser/${userId}`] = true;
      if (hasDisliked) {
        updates["dislikes"] = prod.dislikes - 1;
        updates[`dislikesByUser/${userId}`] = null;
      }
    }
    update(prodRef, updates);
  };

  const handleDislike = (productId) => {
    if (!user) return alert("You must be signed in to dislike.");
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    const prodRef = ref(db, `products/${productId}`);

    const userId = user.uid;
    const hasDisliked = prod.dislikesByUser[userId];
    const hasLiked = prod.likesByUser[userId];

    const updates = {};

    if (hasDisliked) {
      updates["dislikes"] = prod.dislikes - 1;
      updates[`dislikesByUser/${userId}`] = null;
    } else {
      updates["dislikes"] = prod.dislikes + 1;
      updates[`dislikesByUser/${userId}`] = true;
      if (hasLiked) {
        updates["likes"] = prod.likes - 1;
        updates[`likesByUser/${userId}`] = null;
      }
    }
    update(prodRef, updates);
  };

  const handleComment = (productId) => {
    if (!user) return alert("You must be signed in to comment.");
    const text = commentInputs[productId]?.trim();
    if (!text) return;

    const commentRef = ref(db, `products/${productId}/comments`);
    push(commentRef, {
      text,
      userId: user.uid,
      username: user.displayName || "Anonymous",
      userImage: user.photoURL || "",
      time: new Date().toLocaleString(),
    });
    setCommentInputs({ ...commentInputs, [productId]: "" });
  };

  const handleDeleteComment = (productId, commentId, commentUserId) => {
    if (!user) return alert("You must be signed in.");
    if (user.uid !== commentUserId) return alert("You can only delete your own comments.");
    const commentRef = ref(db, `products/${productId}/comments/${commentId}`);
    remove(commentRef);
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
        {isDark ? "🌙" : "☀️"}
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
          <option value="Other">🛠️ Other</option>
        </select>
        <input type="file" onChange={(e) => setImage(e.target.files[0])} />
        <button style={buttonStyle} onClick={handlePost}>
          📤 Post
        </button>
      </div>

      <div style={productGrid}>
        {filtered.map((p) => {
          const userId = user?.uid;
          return (
            <div key={p.id} style={{ ...cardStyle(isDark) }}>
              <img src={p.image} style={imgStyle} onClick={() => setModal(p)} alt={p.title} />
              <h3>{p.title}</h3>
              <p style={{ flexGrow: 1 }}>{p.description}</p>
              <strong style={{ color: "#00ffcc" }}>{p.price}</strong>
              <div style={categoryStyle}>📂 {p.category}</div>
              <div style={{ fontSize: "12px", color: isDark ? "#aaa" : "#555", marginBottom: "8px" }}>{p.time}</div>

              <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                {p.userImage && (
                  <img
                    src={p.userImage}
                    alt={p.username}
                    style={{ width: 28, height: 28, borderRadius: "50%", marginRight: 8, objectFit: "cover" }}
                  />
                )}
                <span style={{ fontSize: 14, color: isDark ? "#00ffcc" : "#00796b" }}>{p.username}</span>
              </div>

              <div style={socialRowStyle}>
                <div>
                  <span
                    onClick={() => handleLike(p.id)}
                    style={{
                      ...emojiBtnStyle,
                      fontWeight: p.likesByUser && p.likesByUser[userId] ? "bold" : "normal",
                      color: p.likesByUser && p.likesByUser[userId] ? "#00ffcc" : undefined,
                      cursor: "pointer",
                    }}
                    role="button"
                    aria-label="Like"
                  >
                    👍 {p.likes}
                  </span>
                  <span
                    onClick={() => handleDislike(p.id)}
                    style={{
                      ...emojiBtnStyle,
                      fontWeight: p.dislikesByUser && p.dislikesByUser[userId] ? "bold" : "normal",
                      color: p.dislikesByUser && p.dislikesByUser[userId] ? "#ff5252" : undefined,
                      cursor: "pointer",
                    }}
                    role="button"
                    aria-label="Dislike"
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

              {/* Comments */}
              <div>
                {p.comments.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      background: isDark ? "#222" : "#eee",
                      padding: "6px 10px",
                      borderRadius: 6,
                      marginTop: 8,
                    }}
                  >
                    {c.userImage && (
                      <img
                        src={c.userImage}
                        alt={c.username}
                        style={{ width: 24, height: 24, borderRadius: "50%", marginRight: 8, objectFit: "cover" }}
                      />
                    )}
                    <div style={{ flexGrow: 1 }}>
                      <strong style={{ color: isDark ? "#00ffcc" : "#00796b", fontSize: 13 }}>{c.username}:</strong>{" "}
                      <span>{c.text}</span>
                      <div style={{ fontSize: 10, color: isDark ? "#888" : "#666" }}>{c.time}</div>
                    </div>
                    {userId === c.userId && (
                      <button
                        onClick={() => handleDeleteComment(p.id, c.id, c.userId)}
                        style={{
                          marginLeft: 10,
                          background: "transparent",
                          border: "none",
                          color: "#ff5252",
                          fontWeight: "bold",
                          cursor: "pointer",
                          fontSize: 16,
                        }}
                        aria-label="Delete comment"
                        title="Delete comment"
                      >
                        ❌
                      </button>
                    )}
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
            </div>
          );
        })}
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
  background: isDark ? "#333" : "#ddd",
  color: isDark ? "#00ffcc" : "#00796b",
  border: "none",
  borderRadius: 20,
  padding: "6px 12px",
  cursor: "pointer",
});

const pageStyle = {
  minHeight: "100vh",
  padding: 20,
  fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  position: "relative",
};

const headerStyle = {
  fontSize: 28,
  fontWeight: "900",
  marginBottom: 20,
  display: "flex",
  justifyContent: "center",
};

const letterStyle = {
  display: "inline-block",
  animationName: "fadeInUp",
  animationDuration: "0.6s",
  animationFillMode: "forwards",
  opacity: 0,
};

const searchInput = {
  width: "100%",
  padding: 10,
  fontSize: 16,
  marginBottom: 20,
  borderRadius: 8,
  border: "1px solid #888",
};

const formStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  marginBottom: 30,
};

const inputStyle = (isDark) => ({
  padding: 10,
  fontSize: 16,
  borderRadius: 6,
  border: "1px solid #555",
  background: isDark ? "#222" : "#fff",
  color: isDark ? "#fff" : "#000",
});

const textStyle = (isDark) => ({
  ...inputStyle(isDark),
  minHeight: 60,
  resize: "vertical",
});

const buttonStyle = {
  padding: "10px 20px",
  fontSize: 16,
  background: "#00ffcc",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
};

const productGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))",
  gap: 20,
};

const cardStyle = (isDark) => ({
  background: isDark ? "#1e1e1e" : "#fff",
  borderRadius: 12,
  padding: 15,
  display: "flex",
  flexDirection: "column",
  boxShadow: isDark
    ? "0 2px 12px rgba(0,255,204,0.2)"
    : "0 2px 12px rgba(0,0,0,0.1)",
  minHeight: 350,
});

const imgStyle = {
  width: "100%",
  height: 150,
  objectFit: "cover",
  borderRadius: 10,
  cursor: "pointer",
  marginBottom: 10,
};

const categoryStyle = {
  fontSize: 14,
  fontWeight: "600",
  marginTop: 6,
  marginBottom: 10,
  color: "#00ffcc",
};

const socialRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 10,
};

const emojiBtnStyle = {
  marginRight: 12,
  userSelect: "none",
};

const waBtnStyle = {
  background: "#25D366",
  color: "#fff",
  borderRadius: 20,
  padding: "6px 14px",
  textDecoration: "none",
  fontWeight: "600",
  fontSize: 14,
};

const commentStyle = (isDark) => ({
  width: "100%",
  padding: 8,
  borderRadius: 6,
  border: "1px solid #666",
  marginTop: 8,
  background: isDark ? "#222" : "#fff",
  color: isDark ? "#fff" : "#000",
  fontSize: 14,
});

const modalOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  backgroundColor: "rgba(0,0,0,0.8)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
};

const modalContent = {
  background: "#111",
  padding: 20,
  borderRadius: 12,
  maxWidth: 600,
  width: "90%",
  color: "#fff",
  textAlign: "center",
  position: "relative",
};

const modalImage = {
  width: "100%",
  maxHeight: 300,
  objectFit: "contain",
  borderRadius: 12,
  marginBottom: 15,
};
