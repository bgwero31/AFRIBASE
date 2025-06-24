// Marketplace.js
import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref, push, onValue, update, remove } from "firebase/database";
import { getAuth } from "firebase/auth";
import SendPrivateMessage from "../components/SendPrivateMessage";

const imgbbKey = "30df4aa05f1af3b3b58ee8a74639e5cf";

export default function Marketplace() {
  const [products, setProducts] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [images, setImages] = useState([]); // Multiple images
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [commentInputs, setCommentInputs] = useState({});
  const [showComments, setShowComments] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [uploading, setUploading] = useState(false);
  const auth = getAuth();

  useEffect(() => {
    const productRef = ref(db, "products");
    onValue(productRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const items = Object.entries(data).map(([id, val]) => ({
          id,
          ...val,
          likes: val.likes || [],
          dislikes: val.dislikes || [],
          comments: val.comments || {},
        }));
        setProducts(items.reverse());
      }
    });
  }, []);

  const handlePost = async () => {
    if (!title || !description || !price || !category || images.length === 0) {
      return alert("Fill all fields and select at least 1 image");
    }

    const user = auth.currentUser;
    if (!user) return alert("Please login to post products.");
    setUploading(true);

    try {
      const uploadedImgs = [];

      for (const img of images) {
        const formData = new FormData();
        formData.append("image", img);
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        uploadedImgs.push({ url: data.data.url, deleteUrl: data.data.delete_url });
      }

      await push(ref(db, "products"), {
        title,
        description,
        price,
        category,
        images: uploadedImgs,
        time: new Date().toLocaleString(),
        likes: [],
        dislikes: [],
        comments: {},
        ownerUID: user.uid,
        ownerName: user.displayName || "Unknown",
      });

      setTitle("");
      setDescription("");
      setPrice("");
      setCategory("");
      setImages([]);
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleLike = (id) => {
    const user = auth.currentUser;
    if (!user) return;

    const product = products.find((p) => p.id === id);
    if (!product) return;

    const liked = product.likes.includes(user.uid);
    const newLikes = liked
      ? product.likes.filter((uid) => uid !== user.uid)
      : [...product.likes, user.uid];

    update(ref(db, `products/${id}`), { likes: newLikes });
  };

  const handleDislike = (id) => {
    const user = auth.currentUser;
    if (!user) return;

    const product = products.find((p) => p.id === id);
    if (!product) return;

    const disliked = product.dislikes.includes(user.uid);
    const newDislikes = disliked
      ? product.dislikes.filter((uid) => uid !== user.uid)
      : [...product.dislikes, user.uid];

    update(ref(db, `products/${id}`), { dislikes: newDislikes });
  };

  const handleComment = (id) => {
    const text = commentInputs[id];
    const user = auth.currentUser;
    if (!text || !user) return;

    const comment = {
      name: user.displayName || "User",
      text,
      timestamp: Date.now(),
    };

    push(ref(db, `products/${id}/comments`), comment);
    setCommentInputs({ ...commentInputs, [id]: "" });
  };

  const handleDeleteProduct = async (id) => {
    const user = auth.currentUser;
    const product = products.find((p) => p.id === id);
    if (!product || user?.uid !== product.ownerUID) return;

    try {
      for (const img of product.images || []) {
        if (img.deleteUrl) await fetch(img.deleteUrl);
      }
      await remove(ref(db, `products/${id}`));
    } catch (e) {
      alert("Failed to delete: " + e.message);
    }
  };

  const handleDeleteComment = (prodId, commentKey) => {
    remove(ref(db, `products/${prodId}/comments/${commentKey}`));
  };

  const filtered = products.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      style={{
        ...pageStyle,
        background: "url('/IMG-20250620-WA0007.jpg') center/cover no-repeat",
      }}
    >
      <div style={headerStyle}>
        {"AFRIBASE MARKETPLACE".split("").map((char, i) => (
          <span
            key={i}
            style={{
              ...letterStyle,
              animationDelay: `${i * 0.05}s`,
            }}
          >
            {char}
          </span>
        ))}
      </div>

      <input
        style={searchInput}
        placeholder="🔍 Search products..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

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
        <input type="file" multiple onChange={(e) => setImages(Array.from(e.target.files))} />
        <button onClick={handlePost} disabled={uploading}>
          {uploading ? "Uploading..." : "📤 Post"}
        </button>
      </div>

      <div style={productGrid}>
        {filtered.map((p) => (
          <div key={p.id} style={cardStyle}>
            {auth.currentUser?.uid === p.ownerUID && (
              <div
                style={{
                  position: "absolute",
                  top: 8,
                  right: 12,
                  fontWeight: "bold",
                  fontSize: 16,
                  cursor: "pointer",
                  color: "#fff",
                  background: "rgba(0,0,0,0.4)",
                  borderRadius: "50%",
                  padding: "4px 8px",
                }}
                onClick={() => handleDeleteProduct(p.id)}
              >
                ❌
              </div>
            )}

            {(p.images || []).map((img, i) => (
              <img key={i} src={img.url} alt="" style={imgStyle} />
            ))}
            <h3>{p.title}</h3>
            <p>{p.description}</p>
            <strong style={{ color: "#00cc88" }}>{p.price}</strong>
            <div>📂 {p.category}</div>
            <div style={{ fontSize: "12px", color: "#555" }}>{p.time}</div>

            <div style={socialRowStyle}>
              <div>
                <span onClick={() => handleLike(p.id)} style={emojiBtnStyle}>👍 {p.likes.length}</span>
                <span onClick={() => handleDislike(p.id)} style={emojiBtnStyle}>👎 {p.dislikes.length}</span>
              </div>
              <a
                href={`https://wa.me/?text=Hi I'm interested in your ${encodeURIComponent(p.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={waBtnStyle}
              >
                💬 WhatsApp
              </a>
            </div>

            <div>
              <button onClick={() => setShowComments({ ...showComments, [p.id]: !showComments[p.id] })}>
                💬 Comments ({Object.keys(p.comments).length})
              </button>

              {showComments[p.id] && (
                <div style={{ maxHeight: "100px", overflowY: "auto", marginTop: "5px" }}>
                  {Object.entries(p.comments).map(([key, c]) => (
                    <p key={key}>
                      <span
                        onClick={() => handleDeleteComment(p.id, key)}
                        style={{ color: "red", cursor: "pointer", marginRight: 5 }}
                      >
                        ❌
                      </span>
                      <strong>{c.name}</strong>: {c.text}
                    </p>
                  ))}
                </div>
              )}

              <input
                style={commentInputStyle}
                placeholder="Add a comment..."
                value={commentInputs[p.id] || ""}
                onChange={(e) => setCommentInputs({ ...commentInputs, [p.id]: e.target.value })}
              />
              <button style={buttonStyle} onClick={() => handleComment(p.id)}>Post</button>
            </div>

            <button
              onClick={() => {
                setSelectedUser({ uid: p.ownerUID, name: p.ownerName });
                setShowModal(true);
              }}
              style={{
                backgroundColor: "#00cc88",
                color: "#fff",
                padding: "8px 14px",
                borderRadius: "6px",
                fontWeight: "bold",
                cursor: "pointer",
                marginTop: "10px",
              }}
            >
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
const pageStyle = {
  padding: 20,
  minHeight: "100vh",
  fontFamily: "Poppins, sans-serif",
  position: "relative",
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
};

const headerStyle = {
  textAlign: "center",
  margin: "20px 0",
  fontWeight: "900",
  display: "flex",
  justifyContent: "center",
  flexWrap: "wrap",
  fontSize: "2rem",
};

const letterStyle = {
  background: "linear-gradient(to right, red, black)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  animation: "fade-in 0.5s ease forwards",
  opacity: 0,
};

const searchInput = {
  width: "100%",
  padding: "12px 16px",
  fontSize: 16,
  borderRadius: 10,
  marginBottom: 20,
  border: "1px solid #ccc",
  outline: "none",
};

const productGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))",
  gap: 20,
  marginTop: 20,
};

const cardStyle = {
  background: "#fff",
  padding: 15,
  borderRadius: 15,
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
  position: "relative",
  transition: "transform 0.2s ease, box-shadow 0.2s ease",
  cursor: "default",

  // 👇 Hover effect
  ":hover": {
    transform: "scale(1.015)",
    boxShadow: "0 6px 14px rgba(0, 0, 0, 0.15)",
};

const imgStyle = {
  width: "100%",
  height: "180px",
  objectFit: "cover",
  borderRadius: "10px",
  marginBottom: 10,
};

const commentInputStyle = {
  width: "100%",
  padding: 10,
  borderRadius: 8,
  border: "1px solid #ccc",
  marginTop: 8,
  fontSize: 14,
  outline: "none",
};

const emojiBtnStyle = {
  cursor: "pointer",
  marginRight: 10,
  fontSize: 18,
  transition: "transform 0.2s ease",
};

const waBtnStyle = {
  textDecoration: "none",
  fontWeight: "bold",
  background: "#25D366",
  color: "#fff",
  padding: "6px 12px",
  borderRadius: "6px",
  fontSize: 14,
};

const buttonStyle = {
  background: "#00cc88",
  color: "#fff",
  padding: "6px 14px",
  borderRadius: 6,
  border: "none",
  cursor: "pointer",
  marginTop: 6,
  fontWeight: "bold",
  fontSize: 14,
};

const socialRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: 10,
};

const modalOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(0, 0, 0, 0.6)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
};

const modalContent = {
  background: "#fff",
  padding: 20,
  borderRadius: 12,
  maxWidth: "420px",
  width: "90%",
  textAlign: "center",
};

const modalImage = {
  width: "100%",
  height: "250px",
  objectFit: "cover",
  borderRadius: 10,
  marginBottom: 12,
};
