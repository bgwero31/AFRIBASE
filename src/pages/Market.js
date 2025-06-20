import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref, push, onValue, update, remove } from "firebase/database";

const IMGBB_API_KEY = "30df4aa05f1af3b3b58ee8a74639e5cf";
const EMOJIS = ["❤️", "😂", "😮", "😢"];

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
  const [userReactions, setUserReactions] = useState({});
  let longPressTimer;

  useEffect(() => {
    const productRef = ref(db, "products");
    onValue(productRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const items = Object.entries(data).map(([id, val]) => ({
          id,
          ...val,
          reactions: val.reactions || { "❤️": 0, "😂": 0, "😮": 0, "😢": 0 },
          comments: val.comments || {},
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
    if (!title || !description || !price || !category || !image)
      return alert("Please fill all fields.");
    try {
      const base64Image = await toBase64(image);
      const formData = new FormData();
      formData.append("image", base64Image.split(",")[1]);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: "POST",
        body: formData,
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
        likes: 0,
        dislikes: 0,
        reactions: { "❤️": 0, "😂": 0, "😮": 0, "😢": 0 },
      });

      setTitle("");
      setDescription("");
      setPrice("");
      setCategory("");
      setImage(null);
      alert("✅ Product posted!");
    } catch (error) {
      alert("Failed to upload");
    }
  };

  const handleReaction = (id, emoji) => {
    const key = `${id}_${emoji}`;
    const product = products.find((p) => p.id === id);
    if (!product) return;

    const current = product.reactions?.[emoji] || 0;
    const toggled = userReactions[key];
    const newValue = toggled ? current - 1 : current + 1;

    update(ref(db, `products/${id}/reactions`), {
      [emoji]: newValue,
    });

    setUserReactions({ ...userReactions, [key]: !toggled });
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
    if (window.confirm("Delete this product permanently?")) {
      await fetch(deleteUrl); // delete image from imgbb
      await remove(ref(db, `products/${id}`)); // delete from firebase
    }
  };

  const startLongPress = (id, deleteUrl) => {
    longPressTimer = setTimeout(() => deleteProduct(id, deleteUrl), 1200);
  };
  const cancelLongPress = () => clearTimeout(longPressTimer);

  const isDark = darkMode;
  const filtered = products.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: 20, minHeight: "100vh", background: isDark ? "#121212" : "#f4f4f4", color: isDark ? "#fff" : "#000" }}>
      <button onClick={() => setDarkMode(!darkMode)} style={{ position: "absolute", top: 20, right: 20 }}>
        {isDark ? "☀️" : "🌙"}
      </button>

      <h2>AFRIBASE MARKETPLACE</h2>

      <input placeholder="🔎 Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />

      <div>
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <input placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Category</option>
          <option>📱 Electronics</option>
          <option>👗 Clothing</option>
          <option>🍿 Food</option>
          <option>🚗 Vehicles</option>
          <option>🔧 Other</option>
        </select>
        <input type="file" onChange={(e) => setImage(e.target.files[0])} />
        <button onClick={handlePost}>📤 Post</button>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {filtered.map((p) => (
          <div
            key={p.id}
            onTouchStart={() => startLongPress(p.id, p.imageDeleteUrl)}
            onTouchEnd={cancelLongPress}
            style={{ background: isDark ? "#1e1e1e" : "#fff", padding: 10, borderRadius: 8 }}
          >
            <img src={p.image} style={{ width: "100%", height: 150, objectFit: "cover", borderRadius: 8 }} />
            <h3>{p.title}</h3>
            <p>{p.description}</p>
            <p>💵 {p.price}</p>
            <p>{p.category}</p>
            <p style={{ fontSize: 12, color: "#888" }}>{p.time}</p>

            <div>
              {EMOJIS.map((emoji) => (
                <span
                  key={emoji}
                  style={{ fontSize: 20, marginRight: 10, cursor: "pointer" }}
                  onClick={() => handleReaction(p.id, emoji)}
                >
                  {emoji} {p.reactions?.[emoji] || 0}
                </span>
              ))}
            </div>

            <div>
              {Object.entries(p.comments).map(([key, val]) => (
                <div key={key}>
                  💬 {val} <span onClick={() => deleteComment(p.id, key)} style={{ color: "red", cursor: "pointer" }}>❌</span>
                </div>
              ))}
              <input
                placeholder="💬 Add comment"
                value={commentInputs[p.id] || ""}
                onChange={(e) => setCommentInputs({ ...commentInputs, [p.id]: e.target.value })}
              />
              <button onClick={() => handleComment(p.id)}>Post</button>
            </div>

            <a href={`https://wa.me/?text=Hi I'm interested in your ${encodeURIComponent(p.title)}`} target="_blank" rel="noopener noreferrer">
              💬 WhatsApp
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
