// Marketplace.js import React, { useState, useEffect } from "react"; import { db } from "../firebase"; import { ref, push, onValue, update } from "firebase/database"; import { getAuth } from "firebase/auth"; import SendPrivateMessage from "../components/SendPrivateMessage";

const imgbbKey = "30df4aa05f1af3b3b58ee8a74639e5cf";

export default function Marketplace() { const [products, setProducts] = useState([]); const [title, setTitle] = useState(""); const [description, setDescription] = useState(""); const [price, setPrice] = useState(""); const [category, setCategory] = useState(""); const [image, setImage] = useState(null); const [search, setSearch] = useState(""); const [darkMode, setDarkMode] = useState(true); const [modal, setModal] = useState(null); const [commentInputs, setCommentInputs] = useState({}); const [showComments, setShowComments] = useState({}); const [showModal, setShowModal] = useState(false); const [selectedUser, setSelectedUser] = useState(null); const [uploading, setUploading] = useState(false); const auth = getAuth();

useEffect(() => { const productRef = ref(db, "products"); onValue(productRef, (snapshot) => { const data = snapshot.val(); if (data) { const items = Object.entries(data).map(([id, val]) => ({ id, ...val, likes: val.likes || [], dislikes: val.dislikes || [], comments: val.comments ? Object.values(val.comments) : [], })); setProducts(items.reverse()); } }); }, []);

const handlePost = async () => { if (!title || !description || !price || !category || !image) return alert("Fill all fields");

const user = auth.currentUser;
if (!user) return alert("Please login to post products.");
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

  await push(ref(db, "products"), {
    title,
    description,
    price,
    category,
    image: url,
    time: new Date().toLocaleString(),
    likes: [],
    dislikes: [],
    comments: [],
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

const handleLike = (id) => { const user = auth.currentUser; if (!user) return;

const prodRef = ref(db, `products/${id}`);
const product = products.find((p) => p.id === id);
if (!product) return;

const liked = product.likes.includes(user.uid);
const updatedLikes = liked ? product.likes.filter((uid) => uid !== user.uid) : [...product.likes, user.uid];

update(prodRef, { likes: updatedLikes });

};

const handleDislike = (id) => { const user = auth.currentUser; if (!user) return;

const prodRef = ref(db, `products/${id}`);
const product = products.find((p) => p.id === id);
if (!product) return;

const disliked = product.dislikes.includes(user.uid);
const updatedDislikes = disliked ? product.dislikes.filter((uid) => uid !== user.uid) : [...product.dislikes, user.uid];

update(prodRef, { dislikes: updatedDislikes });

};

const handleComment = (id) => { const text = commentInputs[id]; const user = auth.currentUser; if (!text || !user) return;

const comment = {
  name: user.displayName || "User",
  text,
  timestamp: Date.now(),
};

push(ref(db, `products/${id}/comments`), comment);
setCommentInputs({ ...commentInputs, [id]: "" });

};

const toggleShowComments = (id) => { setShowComments({ ...showComments, [id]: !showComments[id] }); };

const filtered = products.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase()) );

return ( <div style={{ padding: 20 }}> {/* Dark mode toggle /} <button onClick={() => setDarkMode(!darkMode)}>{darkMode ? "☀️" : "🌙"}</button> {/ Header */} <h2> {"AFRIBASE MARKETPLACE".split(" ").map((w, i) => ( <span key={i} style={{ margin: "0 8px" }}> {w.split("").map((c, j) => ( <span key={j} style={{ color: "red" }}>{c}</span> ))} </span> ))} </h2>

{/* Search */}
  <input
    placeholder="🔍 Search..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    style={{ padding: 10, marginBottom: 10, width: "100%" }}
  />

  {/* Post Form */}
  <div>
    <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
    <input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
    <input placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} />
    <select value={category} onChange={(e) => setCategory(e.target.value)}>
      <option value="">Category</option>
      <option value="Electronics">📱 Electronics</option>
      <option value="Clothing">👗 Clothing</option>
      <option value="Food">🍲 Food</option>
      <option value="Vehicles">🚗 Vehicles</option>
      <option value="Other">🔧 Other</option>
    </select>
    <input type="file" onChange={(e) => setImage(e.target.files[0])} />
    <button onClick={handlePost} disabled={uploading}>{uploading ? "Uploading..." : "📤 Post"}</button>
  </div>

  {/* Product Grid */}
  <div>
    {filtered.map((p) => (
      <div key={p.id}>
        <img src={p.image} alt={p.title} style={{ width: "100%", maxHeight: 200, objectFit: "cover" }} />
        <h3>{p.title}</h3>
        <p>{p.description}</p>
        <strong>{p.price}</strong>
        <div>📂 {p.category}</div>
        <div>{p.time}</div>
        <div>
          <span onClick={() => handleLike(p.id)}>👍 {p.likes.length}</span>
          <span onClick={() => handleDislike(p.id)} style={{ marginLeft: 10 }}>👎 {p.dislikes.length}</span>
          <button onClick={() => toggleShowComments(p.id)}>💬 Comments ({p.comments.length})</button>
        </div>
        {showComments[p.id] && (
          <div>
            {p.comments.map((c, i) => (
              <p key={i}><strong>{c.name}</strong>: {c.text}</p>
            ))}
          </div>
        )}
        <input
          placeholder="Add a comment..."
          value={commentInputs[p.id] || ""}
          onChange={(e) => setCommentInputs({ ...commentInputs, [p.id]: e.target.value })}
        />
        <button onClick={() => handleComment(p.id)}>Post</button>

        <button onClick={() => {
          setSelectedUser({ uid: p.ownerUID, name: p.ownerName });
          setShowModal(true);
        }}>Chat Seller</button>
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

); }

