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
  const [image, setImage] = useState(null);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [commentInputs, setCommentInputs] = useState({});
  const [showComments, setShowComments] = useState({});
  const [showChatModal, setShowChatModal] = useState(false);
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
      } else {
        setProducts([]);
      }
    });
  }, []);

  const handlePost = async () => {
    if (!title || !description || !price || !category || !image) {
      alert("Fill all fields");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      alert("Please login to post products.");
      return;
    }
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("image", image);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!data.success) throw new Error("Image upload failed");

      const url = data.data.url;
      const deleteUrl = data.data.delete_url;

      await push(ref(db, "products"), {
        title,
        description,
        price,
        category,
        image: url,
        deleteUrl,
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
      setImage(null);
    } catch (err) {
      alert("Image upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleLike = (id) => {
    const user = auth.currentUser;
    if (!user) return;

    const prodRef = ref(db, `products/${id}`);
    const product = products.find((p) => p.id === id);
    if (!product) return;

    const liked = product.likes.includes(user.uid);
    const updatedLikes = liked
      ? product.likes.filter((uid) => uid !== user.uid)
      : [...product.likes, user.uid];

    update(prodRef, { likes: updatedLikes });
  };

  const handleDislike = (id) => {
    const user = auth.currentUser;
    if (!user) return;

    const prodRef = ref(db, `products/${id}`);
    const product = products.find((p) => p.id === id);
    if (!product) return;

    const disliked = product.dislikes.includes(user.uid);
    const updatedDislikes = disliked
      ? product.dislikes.filter((uid) => uid !== user.uid)
      : [...product.dislikes, user.uid];

    update(prodRef, { dislikes: updatedDislikes });
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
    try {
      const product = products.find((p) => p.id === id);
      if (!product) return;

      if (product.deleteUrl) {
        // imgbb delete URL is GET request
        await fetch(product.deleteUrl, { method: "GET" });
      }

      await remove(ref(db, `products/${id}`));
    } catch (error) {
      alert("Failed to delete product image: " + error.message);
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

      <div style={postFormStyle}>
        <input
          style={inputStyle}
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          style={inputStyle}
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <input
          style={inputStyle}
          placeholder="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <select
          style={inputStyle}
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
        <input
          type="file"
          accept="image/*"
          style={fileInputStyle}
          onChange={(e) => setImage(e.target.files[0])}
        />
        <button style={buttonStyle} onClick={handlePost} disabled={uploading}>
          {uploading ? "Uploading..." : "📤 Post"}
        </button>
      </div>

      <div style={productGrid}>
        {filtered.map((p) => (
          <div key={p.id} style={cardStyle}>
            <div
              style={deleteProductStyle}
              onClick={() => handleDeleteProduct(p.id)}
              title="Delete product"
            >
              ❌
            </div>

            <img
              src={p.image}
              style={imgStyle}
              alt={p.title}
              onClick={() => setModal(p)}
            />
            <h3>{p.title}</h3>
            <p>{p.description}</p>
            <strong style={{ color: "#00cc88" }}>{p.price}</strong>
            <div>📂 {p.category}</div>
            <div style={{ fontSize: "12px", color: "#555" }}>{p.time}</div>

            <div style={socialRowStyle}>
              <div>
                <span
                  onClick={() => handleLike(p.id)}
                  style={emojiBtnStyle}
                  title="Like"
                >
                  👍 {p.likes.length}
                </span>
                <span
                  onClick={() => handleDislike(p.id)}
                  style={emojiBtnStyle}
                  title="Dislike"
                >
                  👎 {p.dislikes.length}
                </span>
              </div>
              <a
                href={`https://wa.me/?text=Hi I'm interested in your ${encodeURIComponent(
                  p.title
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                style={waBtnStyle}
                title="Contact on WhatsApp"
              >
                💬 WhatsApp
              </a>
            </div>

            <div>
              <button
                onClick={() =>
                  setShowComments({ ...showComments, [p.id]: !showComments[p.id] })
                }
                style={commentToggleBtnStyle}
              >
                💬 Comments ({Object.keys(p.comments).length})
              </button>

              {showComments[p.id] && (
                <div style={commentsListStyle}>
                  {Object.entries(p.comments).map(([key, c]) => (
                    <p key={key} style={commentStyle}>
                      <span
                        onClick={() => handleDeleteComment(p.id, key)}
                        style={deleteCommentStyle}
                        title="Delete comment"
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
                onChange={(e) =>
                  setCommentInputs({ ...commentInputs, [p.id]: e.target.value })
                }
              />
              <button style={buttonStyle} onClick={() => handleComment(p.id)}>
                Post
              </button>
            </div>

            <button
              onClick={() => {
                setSelectedUser({ uid: p.ownerUID, name: p.ownerName });
                setShowChatModal(true);
              }}
              style={chatSellerBtnStyle}
            >
              Chat Seller
            </button>
          </div>
        ))}
      </div>

      {modal && (
        <div style={modalOverlay} onClick={() => setModal(null)}>
          <div
            style={modalContent}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <img src={modal.image} style={modalImage} alt={modal.title} />
            <h2>{modal.title}</h2>
            <p>{modal.description}</p>
            <p>📂 {modal.category}</p>
            <p style={{ color: "#00cc88", fontWeight: "bold" }}>{modal.price}</p>
            <p style={{ fontSize: "12px", color: "#aaa" }}>{modal.time}</p>
            <a
              href={`https://wa.me/?text=Hi I'm interested in your ${encodeURIComponent(
                modal.title
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              style={waBtnStyle}
            >
              💬 WhatsApp
            </a>
            <button
              onClick={() => setModal(null)}
              style={modalCloseBtnStyle}
              aria-label="Close modal"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showChatModal && selectedUser && (
        <SendPrivateMessage
          recipientUID={selectedUser.uid}
          recipientName={selectedUser.name}
          onClose={() => setShowChatModal(false)}
          productId={null}
        />
      )}
    </div>
  );
}

// Styles
const pageStyle = {
  padding: 20,
  minHeight: "100vh",
  fontFamily: "'Poppins', sans-serif",
  position: "relative",
  backgroundColor: "#f9f9f9",
};

const headerStyle = {
  textAlign: "center",
  margin: "20px 0",
  fontWeight: "800",
  display: "flex",
  justifyContent: "center",
  flexWrap: "wrap",
  fontSize: "2rem",
  userSelect: "none",
};

const letterStyle = {
  background: "linear-gradient(to right, red, black)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  animation: "fade-in 0.5s ease forwards",
  opacity: 0,
  userSelect: "none",
};

const searchInput = {
  width: "100%",
  padding: 12,
  fontSize: 16,
  borderRadius: 10,
  margin: "10px 0 20px 0",
  border: "1px solid #ccc",
  outline: "none",
};

const postFormStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
  marginBottom: 20,
  alignItems: "center",
};

const inputStyle = {
  padding: 10,
  fontSize: 14,
  borderRadius: 10,
  border: "1px solid #ccc",
  width: "100%",
  boxSizing: "border-box",
};

const fileInputStyle = {
  gridColumn: "span 2",
};

const buttonStyle = {
  gridColumn: "span 2",
  background: "#00cc88",
  color: "#fff",
  padding: "10px 0",
  borderRadius: 10,
  border: "none",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: 16,
  transition: "background-color 0.3s ease",
};

const productGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: 20,
};

const cardStyle = {
  background: "#fff",
  padding: 15,
  borderRadius: 15,
  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
  position: "relative",
  transition: "transform 0.3s ease, box-shadow 0.3s ease",
  cursor: "default",
};

const deleteProductStyle = {
  position: "absolute",
  top: 10,
  right: 10,
  fontWeight: "bold",
  fontSize: 20,
  cursor: "pointer",
  color: "red",
};

const imgStyle = {
  width: "100%",
  height: 180,
  objectFit: "cover",
  borderRadius: 12,
  marginBottom: 10,
  cursor: "pointer",
  transition: "transform 0.3s ease",
};

const socialRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: 10,
};

const emojiBtnStyle = {
  cursor: "pointer",
  marginRight: 15,
  fontWeight: "bold",
  userSelect: "none",
};

const waBtnStyle = {
  textDecoration: "none",
  fontWeight: "bold",
  background: "#25D366",
  color: "#fff",
  padding: "6px 12px",
  borderRadius: "6px",
  userSelect: "none",
};

const commentToggleBtnStyle = {
  background: "transparent",
  border: "none",
  color: "#007bff",
  cursor: "pointer",
  padding: 0,
  fontSize: 14,
  marginTop: 10,
  userSelect: "none",
};

const commentsListStyle = {
  maxHeight: 120,
  overflowY: "auto",
  marginTop: 5,
  borderTop: "1px solid #eee",
  paddingTop: 5,
};

const commentStyle = {
  fontSize: 13,
  marginBottom: 5,
};

const deleteCommentStyle = {
  color: "red",
  cursor: "pointer",
  marginRight: 6,
  userSelect: "none",
};

const commentInputStyle = {
  width: "100%",
  padding: 8,
  borderRadius: 8,
  border: "1px solid #ccc",
  marginTop: 8,
  boxSizing: "border-box",
  fontSize: 14,
};

const chatSellerBtnStyle = {
  backgroundColor: "#00cc88",
  color: "#fff",
  padding: "10px 16px",
  borderRadius: 10,
  fontWeight: "bold",
  cursor: "pointer",
  marginTop: 12,
  width: "100%",
  border: "none",
  userSelect: "none",
};

const modalOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
};

const modalContent = {
  background: "#fff",
  padding: 25,
  borderRadius: 15,
  width: "90%",
  maxWidth: 450,
  boxSizing: "border-box",
  textAlign: "center",
  position: "relative",
};

const modalImage = {
  width: "100%",
  height: 220,
  objectFit: "cover",
  borderRadius: 15,
  marginBottom: 15,
};

const modalCloseBtnStyle = {
  position: "absolute",
  top: 10,
  right: 15,
  border: "none",
  background: "transparent",
  fontSize: 18,
  cursor: "pointer",
  color: "#333",
  userSelect: "none",
};
