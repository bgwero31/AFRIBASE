// ✅ Afribase Marketplace.js (Updated with user sync)

import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref, push, onValue, update, child, get } from "firebase/database";
import { getAuth, onAuthStateChanged } from "firebase/auth";

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
  const [currentUser, setCurrentUser] = useState(null);
  const auth = getAuth();

  useEffect(() => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const snap = await get(child(ref(db), `users/${user.uid}`));
        if (snap.exists()) {
          setCurrentUser({ uid: user.uid, ...snap.val() });
        }
      } else {
        setCurrentUser(null);
      }
    });
  }, []);

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
          comments: val.comments ? Object.values(val.comments) : []
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
    if (!title || !description || !price || !category || !image || !currentUser) {
      return alert("⚠️ Please fill in all fields and login.");
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
        userId: currentUser.uid,
        userName: currentUser.name,
        userImage: currentUser.image || "",
      });

      setTitle("");
      setDescription("");
      setPrice("");
      setCategory("");
      setImage(null);
      alert("✅ Product posted!");
    } catch (error) {
      console.error(error);
      alert("❌ Upload failed. Try again.");
    }
  };

  const handleLike = (id, delta) => {
    const field = delta > 0 ? "likes" : "dislikes";
    const prodRef = ref(db, `products/${id}`);
    update(prodRef, { [field]: products.find(p => p.id === id)[field] + 1 });
  };

  const handleComment = (id) => {
    const text = commentInputs[id];
    if (!text) return;
    push(ref(db, `products/${id}/comments`), text);
    setCommentInputs({ ...commentInputs, [id]: "" });
  };

  const filtered = products.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase())
  );

  const isDark = darkMode;

  return (
    <div style={{ padding: 20 }}>
      <button onClick={() => setDarkMode(!darkMode)}>
        {darkMode ? "☀️" : "🌑"}
      </button>

      <h2>🛍️ AFRIBASE MARKETPLACE</h2>

      <input
        placeholder="🔍 Search products..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div>
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <input placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Category</option>
          <option value="Electronics">📱 Electronics</option>
          <option value="Clothing">👗 Clothing</option>
          <option value="Food">🍲 Food</option>
          <option value="Vehicles">🚗 Vehicles</option>
          <option value="Other">🛠 Other</option>
        </select>
        <input type="file" onChange={(e) => setImage(e.target.files[0])} />
        <button onClick={handlePost}>📤 Post</button>
      </div>

      <div>
        {filtered.map((p) => (
          <div key={p.id}>
            <img src={p.image} width="100%" />
            <h3>{p.title}</h3>
            <p>{p.description}</p>
            <strong>💰 {p.price}</strong>
            <p>📂 {p.category}</p>
            <p style={{ fontSize: "12px", color: "gray" }}>{p.time}</p>

            {/* 👤 Poster Info */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {p.userImage && <img src={p.userImage} alt="" width={24} height={24} style={{ borderRadius: "50%" }} />}
              <span style={{ fontSize: "14px", color: "#555" }}>{p.userName || "Anonymous"}</span>
            </div>

            <div>
              <button onClick={() => handleLike(p.id, 1)}>👍 {p.likes}</button>
              <button onClick={() => handleLike(p.id, -1)}>👎 {p.dislikes}</button>
              <a href={`https://wa.me/?text=Hi I'm interested in your ${encodeURIComponent(p.title)}`} target="_blank">💬 WhatsApp</a>
            </div>

            <input
              placeholder="💬 Add comment..."
              value={commentInputs[p.id] || ""}
              onChange={(e) => setCommentInputs({ ...commentInputs, [p.id]: e.target.value })}
            />
            <button onClick={() => handleComment(p.id)}>Post</button>
          </div>
        ))}
      </div>
    </div>
  );
}
