import React, { useState, useEffect } from "react";
import { db, storage } from "../firebase";
import { ref, push, onValue, update } from "firebase/database";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

export default function Marketplace() {
  // States
  const [products, setProducts] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [image, setImage] = useState(null);
  const [search, setSearch] = useState("");
  const [darkMode, setDarkMode] = useState(true);
  const [modal, setModal] = useState(null);
  const [newComment, setNewComment] = useState("");

  // Load products
  useEffect(() => {
    const productRef = ref(db, "products");
    onValue(productRef, snapshot => {
      const data = snapshot.val() || {};
      const arr = Object.entries(data).map(([id, p]) => ({ id, ...p }));
      setProducts(arr.reverse());
    });
  }, []);

  // Post a product
  const handlePost = async () => {
    if (!title || !description || !price || !category || !image) {
      return alert("Please fill in all fields.");
    }
    const imgRef = storageRef(storage, `marketplace/${Date.now()}-${image.name}`);
    await uploadBytes(imgRef, image);
    const imageUrl = await getDownloadURL(imgRef);
    push(ref(db, "products"), {
      title,
      description,
      price,
      category,
      image: imageUrl,
      time: new Date().toLocaleString(),
      likes: 0,
      comments: {}
    });
    setTitle(""); setDescription(""); setPrice(""); setCategory(""); setImage(null);
  };

  // Like product
  const handleLike = (id, likes) => {
    update(ref(db, `products/${id}`), { likes: likes + 1 });
  };

  // Add comment
  const handleComment = (productId) => {
    if (!newComment.trim()) return;
    const commentRef = ref(db, `products/${productId}/comments`);
    onValue(commentRef, snapshot => {
      const current = snapshot.val() || {};
      const updated = { ...current, [Date.now()]: newComment.trim() };
      update(ref(db, `products/${productId}`), { comments: updated });
    }, { onlyOnce: true });
    setNewComment("");
  };

  const filtered = products.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  const isDark = darkMode;

  return (
    <div style={{ ...styles.page, background: isDark ? "#121212" : "#f4f4f4", color: isDark ? "#fff" : "#000" }}>
      <button style={styles.toggleIcon(isDark)} onClick={() => setDarkMode(d => !d)}>
        {isDark ? "☀️" : "🌙"}
      </button>

      <h2 style={styles.header}>
        {"AFRIBASE MARKETPLACE".split("").map((c, i) => (
          <span key={i} style={{ ...styles.letter, animationDelay: `${i * .1}s` }}>{c}</span>
        ))}
      </h2>

      <input
        style={styles.searchInput(isDark)}
        placeholder="🔍 Search products..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {/* Posting Form */}
      <div style={styles.form}>
        <input style={styles.input} placeholder="Product Title" value={title} onChange={e => setTitle(e.target.value)} />
        <textarea style={styles.textarea} placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
        <input style={styles.input} placeholder="Price" value={price} onChange={e => setPrice(e.target.value)} />
        <select style={styles.input} value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">Select Category</option>
          <option value="Electronics">📱 Electronics</option>
          <option value="Clothing">👗 Clothing</option>
          <option value="Food">🍲 Food</option>
          <option value="Vehicles">🚗 Vehicles</option>
          <option value="Other">🔧 Other</option>
        </select>
        <input type="file" accept="image/*" onChange={e => setImage(e.target.files[0])} style={styles.input} />
        <button style={styles.button} onClick={handlePost}>📤 Post Product</button>
      </div>

      {/* Product Grid */}
      <div style={styles.grid}>
        {filtered.map(p => (
          <div key={p.id} style={styles.card(isDark)}>
            <img src={p.image} alt="" style={styles.image} onClick={() => setModal(p)} />
            <h3>{p.title}</h3>
            <p>{p.description}</p>
            <strong style={{ color: "#00ffcc" }}>{p.price}</strong>
            <div style={styles.category}>📂 {p.category}</div>
            <div style={styles.time(isDark)}>{p.time}</div>
            <div>
              <button style={styles.smallBtn} onClick={() => handleLike(p.id, p.likes)}>❤️ {p.likes}</button>
              <a 
                href={`https://wa.me/?text=I'm interested in your product "${encodeURIComponent(p.title)}"`}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.smallBtn}
              >
                📞 WhatsApp
              </a>
            </div>
            <div>
              <input style={styles.input} placeholder="Add comment..." value={newComment} onChange={e => setNewComment(e.target.value)} />
              <button style={styles.smallBtn} onClick={() => handleComment(p.id)}>💬 Post</button>
              <div style={styles.commentsContainer}>
                {p.comments && Object.values(p.comments).map((c, i) => (<div key={i}>• {c}</div>))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modal && (
        <div style={styles.modalOverlay} onClick={() => setModal(null)}>
          <div style={styles.modalContent}>
            <img src={modal.image} alt="" style={styles.modalImage} />
            <h2>{modal.title}</h2>
            <p>{modal.description}</p>
            <strong>{modal.price}</strong>
            <div>📂 {modal.category}</div>
            <div style={styles.time(isDark)}>{modal.time}</div>
            <a 
              href={`https://wa.me/?text=I'm interested in your product "${encodeURIComponent(modal.title)}"`}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.button}
            >
              📞 Contact Seller
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// Styles
const styles = {
  page: { padding: 20, minHeight: "100vh", position: "relative" },
  toggleIcon: d => ({
    position: "absolute", top: 20, right: 20, fontSize: 20,
    background: d ? "#00ffcc" : "#121212", color: d ? "#000" : "#fff",
    padding: 10, borderRadius: "50%", boxShadow: "0 0 10px #00ffcc99", border: "none"
  }),
  header: { textAlign: "center", marginBottom: 20, fontSize: 32, fontWeight: 900, display: "flex", justifyContent: "center", flexWrap: "wrap" },
  letter: { background: "linear-gradient(to top, #00ffcc, #000)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "flickerColor 2s infinite", display: "inline-block" },
  searchInput: d => ({ ...styles.input, background: d ? "#1f1f1f" : "#fff", color: d ? "#fff" : "#000", margin: "0 auto 20px", display: "block" }),
  form: { display: "flex", flexDirection: "column", gap: 10, maxWidth: 400, margin: "0 auto", marginBottom: 30 },
  input: { padding: 12, borderRadius: 8, border: "none", fontSize: 16, backgroundColor: "#1f1f1f", color: "#fff" },
  textarea: { height: 80, resize: "none", padding: 12, borderRadius: 8, border: "none", fontSize: 16, backgroundColor: "#1f1f1f", color: "#fff" },
  button: { padding: 12, backgroundColor: "#00ffcc", border: "none", fontWeight: "bold", fontSize: 16, cursor: "pointer", color: "#000", borderRadius: 8, marginTop: 10 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 },
  card: d => ({ backgroundColor: d ? "#1e1e1e" : "#fff", color: d ? "#fff" : "#000", padding: 15, borderRadius: 12, boxShadow: "0 0 10px #00ffcc30" }),
  image: { width: "100%", height: 160, objectFit: "cover", borderRadius: 8, cursor: "pointer" },
  category: { fontSize: 14, color: "#00ffcc", marginTop: 8 },
  time: d => ({ fontSize: 12, color: d ? "#aaa" : "#555", marginTop: 5 }),
  smallBtn: { marginTop: 5, marginRight: 10, padding: "6px 12px", backgroundColor: "#00ffcc", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14 },
  commentsContainer: { marginTop: 10, fontSize: 13, maxHeight: 80, overflowY: "auto" },
  modalOverlay: { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 10 },
  modalContent: { backgroundColor: "#1e1e1e", color: "#fff", padding: 20, borderRadius: 12, maxWidth: "90%", maxHeight: "90%", overflowY: "auto", textAlign: "center" },
  modalImage: { width: "100%", maxHeight: 300, objectFit: "contain", borderRadius: 8, marginBottom: 20 }
};
