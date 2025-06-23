// ✅ UPDATED Marketplace with working image upload (like Task 1) and expandable comment modal

import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref, push, onValue, update } from "firebase/database";
import { getAuth } from "firebase/auth";
import SendPrivateMessage from "../components/SendPrivateMessage";

const imgbbKey = "30df4aa05f1af3b3b58ee8a74639e5cf";

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
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [expandedComments, setExpandedComments] = useState(null);

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
          comments: val.comments ? Object.values(val.comments) : [],
        }));
        setProducts(items.reverse());
      }
    });
  }, []);

  const handlePost = async () => {
    if (!title || !description || !price || !category || !image) return alert("Fill all fields");
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("image", image);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      const url = data.data.url;

      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return alert("Please login to post products.");

      push(ref(db, "products"), {
        title,
        description,
        price,
        category,
        image: url,
        time: new Date().toLocaleString(),
        likes: 0,
        dislikes: 0,
        ownerUID: user.uid,
        ownerName: user.displayName || "Unknown",
      });

      setTitle("");
      setDescription("");
      setPrice("");
      setCategory("");
      setImage(null);
    } catch (err) {
      alert("Image upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleLike = (id, delta) => {
    const field = delta > 0 ? "likes" : "dislikes";
    const prodRef = ref(db, `products/${id}`);
    const product = products.find((p) => p.id === id);
    if (!product) return;
    update(prodRef, { [field]: product[field] + 1 });
  };

  const handleComment = (id) => {
    const text = commentInputs[id];
    if (!text) return;
    push(ref(db, `products/${id}/comments`), text);
    setCommentInputs({ ...commentInputs, [id]: "" });
  };

  const filtered = products.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
  );

  const isDark = darkMode;

  return (
    <div style={{ background: isDark ? "#121212" : "#f4f4f4", color: isDark ? "#fff" : "#000", padding: 20 }}>
      <button onClick={() => setDarkMode(!darkMode)}>
        {isDark ? "☀️" : "🌙"}
      </button>

      <h2>AFRIBASE MARKETPLACE</h2>
      <input
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div>
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <input placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Category</option>
          <option value="Electronics">Electronics</option>
          <option value="Clothing">Clothing</option>
          <option value="Food">Food</option>
          <option value="Vehicles">Vehicles</option>
        </select>
        <input type="file" onChange={(e) => setImage(e.target.files[0])} />
        <button onClick={handlePost}>{uploading ? "Uploading..." : "Post"}</button>
      </div>

      <div>
        {filtered.map((p) => (
          <div key={p.id}>
            <img src={p.image} alt={p.title} style={{ width: "100%", maxHeight: 200, objectFit: "cover" }} />
            <h3>{p.title}</h3>
            <p>{p.description}</p>
            <p>{p.price}</p>
            <button onClick={() => handleLike(p.id, 1)}>👍 {p.likes}</button>
            <button onClick={() => handleLike(p.id, -1)}>👎 {p.dislikes}</button>

            <input
              placeholder="Comment..."
              value={commentInputs[p.id] || ""}
              onChange={(e) => setCommentInputs({ ...commentInputs, [p.id]: e.target.value })}
            />
            <button onClick={() => handleComment(p.id)}>Post</button>

            {p.comments.length > 0 && (
              <div>
                <button onClick={() => setExpandedComments(expandedComments === p.id ? null : p.id)}>
                  💬 {p.comments.length} comment(s)
                </button>
                {expandedComments === p.id && (
                  <div style={{ maxHeight: 150, overflowY: "auto" }}>
                    {p.comments.map((c, i) => (
                      <p key={i} style={{ borderBottom: "1px solid #ccc" }}>{c}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button onClick={() => {
              setSelectedUser({ uid: p.ownerUID, name: p.ownerName });
              setShowModal(true);
            }}>
              Chat Seller
            </button>
          </div>
        ))}
      </div>

      {showModal && selectedUser && (
        <SendPrivateMessage
          recipientUID={selectedUser.uid}
          recipientName={selectedUser.name}
          onClose={() => setShowModal(false)}
          productId={null}
        />
      )}
    </div>
  );
}
