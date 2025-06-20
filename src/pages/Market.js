import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref, push, onValue, update, remove } from "firebase/database";
import { getAuth } from "firebase/auth";

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
  const [likedProducts, setLikedProducts] = useState({});
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
          comments: val.comments
            ? Object.entries(val.comments).map(([cid, c]) => ({ id: cid, ...c }))
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
    if (!user) {
      return alert("Login first to post.");
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
        uid: user.uid,
        userName: user.displayName || "Anonymous",
        userPhoto: user.photoURL || "",
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
      alert("❌ Upload failed");
    }
  };const handleLike = (id) => {
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
    if (!text || !user) return;
    push(ref(db, `products/${productId}/comments`), {
      text,
      author: user.displayName || "Anon",
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
      alert("❌ Failed to delete.");
    }
  };

  let pressTimer = null;
  const handlePressStart = (id) => {
    pressTimer = setTimeout(() => {
      handleDeleteProduct(id);
    }, 800);
  };
  const handlePressEnd = () => clearTimeout(pressTimer);

  return (
    <div style={{ padding: 20, background: darkMode ? "#121212" : "#f4f4f4", color: darkMode ? "#fff" : "#000" }}>
      <button style={toggleBtnStyle(darkMode)} onClick={() => setDarkMode(!darkMode)}>
        {darkMode ? "🌙" : "🌞"}
      </button>

      <h2 style={headerStyle}>
        {"AFRIBASE MARKETPLACE".split(" ").map((word, i) => (
          <span key={i} style={{ marginRight: "10px" }}>
            {word.split("").map((c, j) => (
              <span key={j} style={{ ...letterStyle, animationDelay: `${(i + j) * 0.05}s` }}>
                {c}
              </span>
            ))}
          </span>
        ))}
      </h2>

      <input
        placeholder="🔍 Search products..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={searchInput}
      />

      <div style={productGrid}>
        {products
          .filter((p) =>
            [p.title, p.description, p.category].join(" ").toLowerCase().includes(search.toLowerCase())
          )
          .map((p) => (
            <div
              key={p.id}
              onMouseDown={() => handlePressStart(p.id)}
              onMouseUp={handlePressEnd}
              onTouchStart={() => handlePressStart(p.id)}
              onTouchEnd={handlePressEnd}
              style={cardStyle(darkMode)}
            >
              <img src={p.image} style={imgStyle} onClick={() => setModal(p)} />
              <h3>{p.title}</h3>
              <p>{p.description}</p>
              <strong style={{ color: "#00ffcc" }}>${p.price}</strong>
              <div style={{ fontSize: 13, margin: "4px 0", color: "#aaa" }}>📂 {p.category}</div>
              <div style={{ fontSize: 12, color: "#777" }}>🕒 {p.time}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "6px 0" }}>
                {p.userPhoto && (
                  <img src={p.userPhoto} alt="user" style={{ width: 26, height: 26, borderRadius: "50%" }} />
                )}
                <span style={{ fontSize: 13 }}>{p.userName}</span>
              </div>

              <div style={socialRowStyle}>
                <div>
                  <span onClick={() => handleLike(p.id)} style={emojiBtnStyle}>
                    👍 {p.likes}
                  </span>
                  <span onClick={() => handleDislike(p.id)} style={emojiBtnStyle}>
                    👎 {p.dislikes}
                  </span>
                </div>
                <a
                  href={`/chatroom?user=${p.uid}`}
                  style={waBtnStyle}
                >
                  💬 Chat Seller
                </a>
              </div>

              {p.comments.map((c) => (
                <div key={c.id} style={commentRow(darkMode)}>
                  <span>💬 {c.text}</span>
                  <button
                    onClick={() => handleDeleteComment(p.id, c.id)}
                    style={{ background: "transparent", border: "none", color: "red", cursor: "pointer" }}
                  >
                    ❌
                  </button>
                </div>
              ))}

              <input
                placeholder="💬 Add comment..."
                value={commentInputs[p.id] || ""}
                onChange={(e) => setCommentInputs({ ...commentInputs, [p.id]: e.target.value })}
                style={commentStyle(darkMode)}
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
            <img src={modal.image} style={modalImage} />
            <h2>{modal.title}</h2>
            <p>{modal.description}</p>
            <p>📂 {modal.category}</p>
            <p style={{ color: "#00ffcc", fontWeight: "bold" }}>{modal.price}</p>
            <a href={`/chatroom?user=${modal.uid}`} style={waBtnStyle}>
              💬 Chat Seller
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// Remaining styles:
const toggleBtnStyle = (dark) => ({
  position: "absolute", top: 20, right: 20, padding: 10, fontSize: 20,
  background: dark ? "#00ffcc" : "#121212", color: dark ? "#000" : "#fff",
  border: "none", borderRadius: 50, boxShadow: "0 0 10px #00ffcc99",
});
const headerStyle = {
  textAlign: "center", margin: "20px 0", fontWeight: "800",
  display: "flex", justifyContent: "center", flexWrap: "wrap",
};
const letterStyle = {
  background: "linear-gradient(to top,#00ffcc,#000)", WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent", animation: "flickerColor 2s infinite",
};
const searchInput = {
  width: "100%", maxWidth: 400, margin: "0 auto 20px", padding: "10px",
  border: "none", borderRadius: 8, fontSize: 16, display: "block",
};
const productGrid = {
  display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 14,
};
const cardStyle = (dark) => ({
  padding: 12, borderRadius: 10, background: dark ? "#1e1e1e" : "#fff",
  boxShadow: "0 0 10px #00ffcc40", color: dark ? "#fff" : "#000",
});
const imgStyle = { width: "100%", height: 140, objectFit: "cover", borderRadius: 8, marginBottom: 10 };
const socialRowStyle = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  marginTop: 8, padding: 6, borderRadius: 6, background: "#00000010",
};
const emojiBtnStyle = { cursor: "pointer", marginRight: 10, fontSize: 16 };
const waBtnStyle = {
  backgroundColor: "#25D366", color: "#fff", padding: "6px 12px", borderRadius: 20,
  textDecoration: "none", fontSize: 14, fontWeight: "500",
};
const commentStyle = (dark) => ({
  padding: 8, borderRadius: 6, fontSize: 14, marginTop: 8,
  background: dark ? "#222" : "#eee", color: dark ? "#fff" : "#000",
  border: "none", width: "100%",
});
const commentRow = (dark) => ({
  background: dark ? "#222" : "#eee", color: dark ? "#fff" : "#000",
  display: "flex", justifyContent: "space-between", alignItems: "center",
  padding: "4px 8px", borderRadius: 6, marginTop: 4,
});
const modalOverlay = {
  position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)",
  display: "flex", justifyContent: "center", alignItems: "center", zIndex: 999,
};
const modalContent = {
  background: "#1e1e1e", padding: 20, borderRadius: 10, color: "#fff",
  maxWidth: "90%", maxHeight: "90%", overflowY: "auto", textAlign: "center",
};
const modalImage = { width: "100%", maxHeight: 300, objectFit: "contain", borderRadius: 8, marginBottom: 20 };
