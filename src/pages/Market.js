import React, { useState, useEffect, useRef } from "react";
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

  // --- Long press hook ---
  const timerRef = useRef(null);
  const handleLongPress = (product) => {
    if (product.userId !== currentUserId) return; // Only owner can delete
    if (window.confirm(`Delete "${product.title}"?`)) {
      handleDeleteProduct(product);
    }
  };
  const useLongPress = (callback = () => {}, ms = 700) => {
    const start = (e, product) => {
      e.preventDefault();
      timerRef.current = setTimeout(() => callback(product), ms);
    };
    const clear = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    return {
      onMouseDown: (e, product) => start(e, product),
      onTouchStart: (e, product) => start(e, product),
      onMouseUp: clear,
      onMouseLeave: clear,
      onTouchEnd: clear,
    };
  };
  const longPressEvents = useLongPress(handleLongPress, 700);
  // --- End long press hook ---

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
          <div
            key={p.id}
            style={{ ...cardStyle(isDark) }}
            onMouseDown={(e) => longPressEvents.onMouseDown(e, p)}
            onTouchStart={(e) => longPressEvents.onTouchStart(e, p)}
            onMouseUp={longPressEvents.onMouseUp}
            onMouseLeave={longPressEvents.onMouseLeave}
            onTouchEnd={longPressEvents.onTouchEnd}
          >
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

// === Styles unchanged ===
