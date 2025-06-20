import React, { useState, useEffect, useRef } from "react";
import { db, storage } from "../firebase";
import {
  ref, push, onValue, update, remove
} from "firebase/database";
import {
  ref as storageRef, uploadBytes, getDownloadURL, deleteObject
} from "firebase/storage";

// Dummy user (replace this with real Firebase Auth user ID)
const currentUserId = "demoUser123";

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
  const timerRef = useRef(null);

  // Load products from Firebase
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
            : []
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

    push(ref(db, "products"), {
      title,
      description,
      price,
      category,
      image: url,
      imagePath: imgRef.fullPath,
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
    update(prodRef, {
      [field]: products.find(p => p.id === id)[field] + 1
    });
  };

  const handleComment = (id) => {
    const text = commentInputs[id];
    if (!text) return;
    push(ref(db, `products/${id}/comments`), {
      text,
      userId: currentUserId,
      timestamp: Date.now()
    });
    setCommentInputs({ ...commentInputs, [id]: "" });
  };

  const handleDeleteComment = (productId, commentId) => {
    if (window.confirm("Delete this comment?")) {
      remove(ref(db, `products/${productId}/comments/${commentId}`));
    }
  };

  const handleDeleteProduct = async (product) => {
    try {
      await deleteObject(storageRef(storage, product.imagePath));
      await remove(ref(db, `products/${product.id}`));
    } catch (err) {
      alert("Delete failed: " + err.message);
    }
  };

  // Long press logic
  const useLongPress = (callback, ms = 800) => {
    const start = (e, p) => {
      e.preventDefault();
      timerRef.current = setTimeout(() => callback(p), ms);
    };
    const clear = () => timerRef.current && clearTimeout(timerRef.current);
    return {
      onMouseDown: (e, p) => start(e, p),
      onTouchStart: (e, p) => start(e, p),
      onMouseUp: clear,
      onTouchEnd: clear,
      onMouseLeave: clear
    };
  };
  const longPress = useLongPress((p) => {
    if (p.userId === currentUserId && window.confirm("Delete this post?")) {
      handleDeleteProduct(p);
    }
  });

  const filtered = products.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase())
  );

  const isDark = darkMode;

  return (
    <div style={{ padding: 20, background: isDark ? "#121212" : "#f4f4f4", color: isDark ? "#fff" : "#000", minHeight: "100vh" }}>
      <button onClick={() => setDarkMode(!darkMode)} style={{ float: "right", marginBottom: 10 }}>
        {isDark ? "☀️" : "🌙"}
      </button>

      <h2 style={{ textAlign: "center", marginBottom: 20 }}>AFRIBASE MARKETPLACE</h2>

      <input
        style={{ padding: 10, width: "100%", maxWidth: 400, margin: "auto", display: "block", marginBottom: 20 }}
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 400, margin: "auto" }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
        <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price" />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Select Category</option>
          <option value="Electronics">Electronics</option>
          <option value="Clothing">Clothing</option>
          <option value="Food">Food</option>
        </select>
        <input type="file" onChange={(e) => setImage(e.target.files[0])} />
        <button onClick={handlePost}>Post</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginTop: 30 }}>
        {filtered.map(p => (
          <div
            key={p.id}
            style={{ background: isDark ? "#1f1f1f" : "#fff", padding: 10, borderRadius: 10 }}
            onMouseDown={(e) => longPress.onMouseDown(e, p)}
            onTouchStart={(e) => longPress.onTouchStart(e, p)}
            onMouseUp={longPress.onMouseUp}
            onTouchEnd={longPress.onTouchEnd}
            onMouseLeave={longPress.onMouseLeave}
          >
            <img src={p.image} alt="" style={{ width: "100%", borderRadius: 6, height: 120, objectFit: "cover", marginBottom: 6 }} onClick={() => setModal(p)} />
            <h4>{p.title}</h4>
            <p>{p.description}</p>
            <strong>${p.price}</strong>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
              <span onClick={() => handleLike(p.id, 1)}>👍 {p.likes}</span>
              <span onClick={() => handleLike(p.id, -1)}>👎 {p.dislikes}</span>
            </div>
            <a href={`https://wa.me/?text=Hi I'm interested in ${p.title}`} target="_blank" rel="noopener noreferrer">
              💬 WhatsApp
            </a>

            <div style={{ marginTop: 10 }}>
              {p.comments.map((c) => (
                <div key={c.id} style={{ fontSize: 12, marginBottom: 4 }}>
                  {c.text}{" "}
                  {c.userId === currentUserId && (
                    <button onClick={() => handleDeleteComment(p.id, c.id)} style={{ color: "red", border: "none", background: "none" }}>
                      ✖
                    </button>
                  )}
                </div>
              ))}
              <input
                value={commentInputs[p.id] || ""}
                onChange={(e) => setCommentInputs({ ...commentInputs, [p.id]: e.target.value })}
                placeholder="Add comment..."
                style={{ width: "100%", marginTop: 4 }}
              />
              <button onClick={() => handleComment(p.id)}>Post</button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "#000000aa", display: "flex", justifyContent: "center", alignItems: "center" }} onClick={() => setModal(null)}>
          <div style={{ background: "#fff", padding: 20, maxWidth: 400, borderRadius: 10 }}>
            <img src={modal.image} alt="" style={{ width: "100%", borderRadius: 10, marginBottom: 10 }} />
            <h2>{modal.title}</h2>
            <p>{modal.description}</p>
            <strong>${modal.price}</strong>
          </div>
        </div>
      )}
    </div>
  );
}
