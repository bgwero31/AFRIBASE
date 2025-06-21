import React, { useState, useEffect } from "react";
import { db, storage } from "../firebase";
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

export default function Marketplace() {
  // Replace this with your actual logged-in user ID from auth
  const currentUserId = "USER_ID_HERE";

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
          comments: val.comments
            ? Object.entries(val.comments).map(([cid, c]) => ({
                id: cid,
                text: c.text,
                userId: c.userId,
                timestamp: c.timestamp
              }))
            : [],
        }));
        setProducts(items.reverse());
      }
    });
  }, []);

  const handlePost = async () => {
    if (!title || !description || !price || !category || !image)
      return alert("Fill all fields");
    const imgRef = storageRef(storage, `marketplace/${Date.now()}-${image.name}`);
    await uploadBytes(imgRef, image);
    const url = await getDownloadURL(imgRef);

    // Save product with owner info (userId)
    push(ref(db, "products"), {
      title,
      description,
      price,
      category,
      image: url,
      imagePath: imgRef.fullPath, // save storage path to delete later
      time: new Date().toLocaleString(),
      likes: 0,
      dislikes: 0,
      userId: currentUserId
    });
    setTitle("");
    setDescription("");
    setPrice("");
    setCategory("");
    setImage(null);
  };

  const handleLike = (id, delta) => {
    const field = delta > 0 ? "likes" : "dislikes";
    const prodRef = ref(db, `products/${id}`);
    update(prodRef, { [field]: products.find((p) => p.id === id)[field] + 1 });
  };

  const handleComment = (productId) => {
    const text = commentInputs[productId];
    if (!text) return;

    // Push comment with userId and timestamp
    push(ref(db, `products/${productId}/comments`), {
      text,
      userId: currentUserId,
      timestamp: Date.now()
    });

    setCommentInputs({ ...commentInputs, [productId]: "" });
  };

  const handleDeleteComment = (productId, commentId) => {
    if (!window.confirm("Delete this comment?")) return;
    remove(ref(db, `products/${productId}/comments/${commentId}`));
  };

  const handleDeleteProduct = async (product) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;

    try {
      // Delete image from storage
      const imgRef = storageRef(storage, product.imagePath);
      await deleteObject(imgRef);

      // Delete product from database
      await remove(ref(db, `products/${product.id}`));
    } catch (error) {
      alert("Error deleting product: " + error.message);
    }
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
        color: isDark ? "#fff" : "#000"
      }}
    >
      <button style={toggleBtnStyle(isDark)} onClick={() => setDarkMode(!darkMode)}>
        {isDark ? "☀️" : "🌙"}
      </button>

      <h2 style={headerStyle}>
        {"AFRIBASE MARKETPLACE".split(" ").map((w, i) => (
          <span key={i} style={{ marginRight: "10px" }}>
            {w.split("").map((c, j) => (
              <span
                key={j}
                style={{ ...letterStyle, animationDelay: `${(i + j) * 0.05}s` }}
              >
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
          color: isDark ? "#fff" : "#000"
        }}
        placeholder="🔍 Search products..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div style={formStyle}>
        <input
          style={inputStyle(isDark)}
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          style={textStyle(isDark)}
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <input
          style={inputStyle(isDark)}
          placeholder="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <select
          style={inputStyle(isDark)}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Category</option>
          <option value="Electronics">📱 Electronics</option>
          <option value="Clothing">👗 Clothing</option>
          <option value="Food">🍲 Food</option>
          <option value="Vehicles">🚗 Vehicles</option>
          <option value="Other">🔧 Other</option>
        </select>
        <input type="file" onChange={(e) => setImage(e.target.files[0])} />
        <button style={buttonStyle} onClick={handlePost}>
          📤 Post
        </button>
      </div>

      <div style={productGrid}>
        {filtered.map((p) => (
          <div key={p.id} style={{ ...cardStyle(isDark) }}>
            <img src={p.image} style={imgStyle} onClick={() => setModal(p)} />
            <h3>{p.title}</h3>
            <p style={{ flexGrow: 1 }}>{p.description}</p>
            <strong style={{ color: "#00ffcc" }}>{p.price}</strong>
            <div style={categoryStyle}>📂 {p.category}</div>
            <div
              style={{
                fontSize: "12px",
                color: isDark ? "#aaa" : "#555",
                marginBottom: "8px"
              }}
            >
              {p.time}
            </div>

            <div style={socialRowStyle}>
              <div>
                <span
                  onClick={() => handleLike(p.id, 1)}
                  style={emojiBtnStyle}
                  title="Like"
                >
                  👍 {p.likes}
                </span>
                <span
                  onClick={() => handleLike(p.id, -1)}
                  style={emojiBtnStyle}
                  title="Dislike"
                >
                  👎 {p.dislikes}
                </span>
              </div>
              <a
                href={`https://wa.me/?text=Hi I'm interested in your ${encodeURIComponent(
                  p.title
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                style={waBtnStyle}
              >
                💬 WhatsApp
              </a>

              {/* Show delete product button ONLY if current user owns product */}
              {p.userId === currentUserId && (
                <button
                  onClick={() => handleDeleteProduct(p)}
                  style={{
                    marginLeft: 10,
                    backgroundColor: "#ff4444",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    padding: "6px 10px",
                    cursor: "pointer",
                    fontWeight: "600"
                  }}
                  title="Delete product"
                >
                  🗑️ Delete
                </button>
              )}
            </div>

            {/* Comments Section */}
            <div>
              {p.comments.length > 0 && (
                <div
                  style={{
                    maxHeight: "80px",
                    overflowY: "auto",
                    marginBottom: 6,
                    fontSize: 13,
                    color: isDark ? "#ccc" : "#444"
                  }}
                >
                  {p.comments.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        borderBottom: "1px solid #444",
                        padding: "2px 0",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <span>
                        {c.text}{" "}
                        <small style={{ fontSize: 10, color: "#999" }}>
                          {new Date(c.timestamp).toLocaleString()}
                        </small>
                      </span>
                      {/* Show delete comment button only if current user owns the comment */}
                      {c.userId === currentUserId && (
                        <button
                          onClick={() => handleDeleteComment(p.id, c.id)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#ff5555",
                            cursor: "pointer",
                            fontWeight: "bold"
                          }}
                          title="Delete comment"
                        >
                          ✖
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <input
                style={commentStyle(isDark)}
                placeholder="💬 Add comment..."
                value={commentInputs[p.id] || ""}
                onChange={(e) =>
                  setCommentInputs({ ...commentInputs, [p.id]: e.target.value })
                }
              />
              <button style={buttonStyle} onClick={() => handleComment(p.id)}>
                Post
              </button>
            </div>
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

// === Styles (unchanged, just for reference) ===
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
  zIndex: 2
});

const pageStyle = {
  padding: 20,
  minHeight: "100vh",
  fontFamily: "Poppins",
  position: "relative"
};
const headerStyle = {
  textAlign: "center",
  margin: "20px 0",
  fontWeight: "800",
  display: "flex",
  justifyContent: "center",
  flexWrap: "wrap"
};
const letterStyle = {
  background: "linear-gradient(to top,#00ffcc,#000)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  animation: "flickerColor 2s infinite"
};
const searchInput = {
  width: "100%",
  maxWidth: 400,
  display: "block",
  margin: "0 auto 20px",
  padding: 10,
  border: "none",
  borderRadius: 8,
  fontSize: 16
};
const formStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  maxWidth: "100%",
  padding: 10,
  margin: "0 auto 20px",
  boxSizing: "border-box"
};
const inputStyle = (isDark) => ({
  padding: 12,
  borderRadius: 8,
  border: "none",
  fontSize: 16,
  background: isDark ? "#1f1f1f" : "#fff",
  color: isDark ? "#fff" : "#000"
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
  marginTop: 5
};
const productGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 14
};
const cardStyle = (isDark) => ({
  padding: 12,
  borderRadius: 10,
  boxShadow: "0 0 10px #00ffcc30",
  display: "flex",
  flexDirection: "column",
  background: isDark ? "#1e1e1e" : "#fff",
  color: isDark ? "#fff" : "#000"
});
const imgStyle = {
  width: "100%",
  height: "110px",
  objectFit: "cover",
  borderRadius: 8,
  marginBottom: 8,
  cursor: "pointer"
};
const categoryStyle = { fontSize: 14, color: "#00ffcc", margin: "5px 0" };
const socialRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  background: "rgba(255,255,255,0.06)",
  padding: 8,
  borderRadius: 8,
  marginTop: 10
};
const emojiBtnStyle = { cursor: "pointer", marginRight: 10, fontSize: 16 };
const waBtnStyle = {
  backgroundColor: "#25D366",
  color: "#fff",
  padding: "6px 12px",
  borderRadius: 20,
  textDecoration: "none",
  fontSize: 14,
  fontWeight: "500"
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
  zIndex: 10
};
const modalContent = {
  background: "#1e1e1e",
  padding: 20,
  borderRadius: 10,
  maxWidth: "90%",
  maxHeight: "90%",
  color: "#fff",
  overflowY: "auto",
  textAlign: "center"
};
const modalImage = {
  width: "100%",
  maxHeight: 300,
  objectFit: "contain",
  borderRadius: 8,
  marginBottom: 20
};
