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
  const [commentInputs, setCommentInputs] = useState({});
  const [userReactions, setUserReactions] = useState({}); // like toggle
  let longPressTimer;

  const emojis = ["❤️", "😂", "😮", "😢"];

  useEffect(() => {
    const productRef = ref(db, "products");
    onValue(productRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const items = Object.entries(data).map(([id, val]) => ({
          id,
          ...val,
          reactions: val.reactions || { "❤️": 0, "😂": 0, "😮": 0, "😢": 0 },
          comments: val.comments ? val.comments : {},
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
    if (!title || !description || !price || !category || !image) return alert("Please fill all fields.");
    try {
      const base64Image = await toBase64(image);
      const formData = new FormData();
      formData.append("image", base64Image.split(",")[1]);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (!data.success) throw new Error("Upload failed");

      const imageUrl = data.data.url;
      const imageDeleteUrl = data.data.delete_url;

      push(ref(db, "products"), {
        title,
        description,
        price,
        category,
        image: imageUrl,
        imageDeleteUrl,
        time: new Date().toLocaleString(),
        reactions: { "❤️": 0, "😂": 0, "😮": 0, "😢": 0 }
      });

      setTitle(""); setDescription(""); setPrice(""); setCategory(""); setImage(null);
      alert("✅ Product posted!");
    } catch (error) {
      alert("Failed to upload");
    }
  };

  const toggleReaction = (id, emoji) => {
    const product = products.find(p => p.id === id);
    if (!product) return;

    const key = `${id}_${emoji}`;
    const alreadyReacted = userReactions[key] || false;
    const current = product.reactions[emoji] || 0;
    const newCount = alreadyReacted ? current - 1 : current + 1;

    const prodRef = ref(db, `products/${id}/reactions`);
    update(prodRef, { [emoji]: newCount });

    setUserReactions({ ...userReactions, [key]: !alreadyReacted });
  };

  const handleComment = (id) => {
    const text = commentInputs[id];
    if (!text) return;
    push(ref(db, `products/${id}/comments`), text);
    setCommentInputs({ ...commentInputs, [id]: "" });
  };

  const deleteComment = (productId, commentKey) => {
    remove(ref(db, `products/${productId}/comments/${commentKey}`));
  };

  const deleteProduct = async (id, deleteUrl) => {
    if (confirm("Delete this product permanently?")) {
      try {
        await fetch(deleteUrl);
      } catch (e) {}
      await remove(ref(db, `products/${id}`));
    }
  };

  const startLongPress = (id, deleteUrl) => {
    longPressTimer = setTimeout(() => deleteProduct(id, deleteUrl), 1200);
  };
  const cancelLongPress = () => clearTimeout(longPressTimer);

  const isDark = darkMode;
  const filtered = products.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ ...pageStyle, background: isDark ? "#121212" : "#f4f4f4", color: isDark ? "#fff" : "#000" }}>
      <button style={toggleBtnStyle(isDark)} onClick={() => setDarkMode(!darkMode)}>
        {isDark ? "☀️" : "🌙"}
      </button>

      <h2 style={headerStyle}>
        {"AFRIBASE MARKETPLACE".split(" ").map((w, i) =>
          <span key={i} style={{ marginRight: 10 }}>
            {w.split("").map((c, j) => <span key={j} style={letterStyle}>{c}</span>)}
          </span>
        )}
      </h2>

      <input style={{ ...searchInput, background: isDark ? "#1f1f1f" : "#fff", color: isDark ? "#fff" : "#000" }}
        placeholder="🔎 Search products..." value={search} onChange={e => setSearch(e.target.value)} />

      <div style={formStyle}>
        <input style={inputStyle(isDark)} placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
        <textarea style={inputStyle(isDark)} placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
        <input style={inputStyle(isDark)} placeholder="Price" value={price} onChange={e => setPrice(e.target.value)} />
        <select style={inputStyle(isDark)} value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">Category</option>
          <option>📱 Electronics</option>
          <option>👗 Clothing</option>
          <option>🍿 Food</option>
          <option>🚗 Vehicles</option>
          <option>🛠 Other</option>
        </select>
        <input type="file" onChange={e => setImage(e.target.files[0])} />
        <button style={buttonStyle} onClick={handlePost}>📤 Post</button>
      </div>

      <div style={productGrid}>
        {filtered.map(p => (
          <div key={p.id} style={cardStyle(isDark)} onTouchStart={() => startLongPress(p.id, p.imageDeleteUrl)} onTouchEnd={cancelLongPress}>
            <img src={p.image} style={imgStyle} alt={p.title} />
            <h3>{p.title}</h3>
            <p>{p.description}</p>
            <strong style={{ color: "#00ffcc" }}>{p.price}</strong>
            <div style={categoryStyle}>📂 {p.category}</div>
            <div style={{ fontSize: 12, color: "#aaa", margin: "5px 0" }}>{p.time}</div>

            <div style={{ margin: "6px 0" }}>
              {emojis.map((emoji, i) => (
                <span key={i} onClick={() => toggleReaction(p.id, emoji)} style={emojiBtnStyle}>
                  {emoji} {p.reactions[emoji] || 0}
                </span>
              ))}
            </div>

            <a href={`https://wa.me/?text=Hi I'm interested in your ${encodeURIComponent(p.title)}`} target="_blank" rel="noreferrer" style={waBtnStyle}>💬 WhatsApp</a>

            {Object.entries(p.comments).map(([key, text]) => (
              <div key={key} style={{ marginTop: 5, fontSize: 14 }}>
                {text} <span onClick={() => deleteComment(p.id, key)} style={{ color: "red", cursor: "pointer" }}>❌</span>
              </div>
            ))}

            <input style={commentStyle(isDark)} value={commentInputs[p.id] || ""} onChange={e => setCommentInputs({ ...commentInputs, [p.id]: e.target.value })} placeholder="💬 Comment..." />
            <button style={buttonStyle} onClick={() => handleComment(p.id)}>Post</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// STYLES — no changes
const toggleBtnStyle = isDark => ({ position: "absolute", top: 20, right: 20, fontSize: 20, background: isDark ? "#00ffcc" : "#121212", color: isDark ? "#000" : "#fff", padding: 10, borderRadius: 50, border: "none", boxShadow: "0 0 10px #00ffcc99", zIndex: 2 });
const pageStyle = { padding: 20, fontFamily: "Poppins, sans-serif", minHeight: "100vh", position: "relative" };
const headerStyle = { textAlign: "center", margin: "20px 0", fontWeight: "bold", display: "flex", justifyContent: "center", flexWrap: "wrap" };
const letterStyle = { background: "linear-gradient(to top,#00ffcc,#000)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" };
const searchInput = { width: "100%", maxWidth: 400, margin: "0 auto 20px", padding: 10, border: "none", borderRadius: 8, fontSize: 16, display: "block" };
const formStyle = { display: "flex", flexDirection: "column", gap: 10, maxWidth: 400, margin: "0 auto 20px" };
const inputStyle = isDark => ({ padding: 12, borderRadius: 8, border: "none", fontSize: 16, background: isDark ? "#1f1f1f" : "#fff", color: isDark ? "#fff" : "#000" });
const buttonStyle = { padding: 10, backgroundColor: "#00ffcc", color: "#000", border: "none", borderRadius: 6, fontSize: 14, cursor: "pointer" };
const productGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 16 };
const cardStyle = isDark => ({ padding: 12, borderRadius: 10, boxShadow: "0 0 10px #00ffcc30", background: isDark ? "#1e1e1e" : "#fff", color: isDark ? "#fff" : "#000" });
const imgStyle = { width: "100%", height: 150, objectFit: "cover", borderRadius: 8, marginBottom: 10 };
const categoryStyle = { fontSize: 14, color: "#00ffcc" };
const emojiBtnStyle = { cursor: "pointer", marginRight: 10, fontSize: 18 };
const waBtnStyle = { backgroundColor: "#25D366", color: "#fff", padding: "6px 12px", borderRadius: 20, textDecoration: "none", fontSize: 14, fontWeight: "500", display: "inline-block", marginTop: 10 };
const commentStyle = isDark => ({ ...inputStyle(isDark), marginTop: 10 });
