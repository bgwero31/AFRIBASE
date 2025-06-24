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
  const currentUser = auth.currentUser;

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

    if (!currentUser) {
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
      // NO deleteUrl stored since we won't delete from imgbb

      await push(ref(db, "products"), {
        title,
        description,
        price,
        category,
        image: url,
        time: new Date().toLocaleString(),
        likes: [],
        dislikes: [],
        comments: {},
        ownerUID: currentUser.uid,
        ownerName: currentUser.displayName || currentUser.email || "Anonymous",
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
    if (!currentUser) return;

    const prodRef = ref(db, `products/${id}`);
    const product = products.find((p) => p.id === id);
    if (!product) return;

    const liked = product.likes.includes(currentUser.uid);
    const updatedLikes = liked
      ? product.likes.filter((uid) => uid !== currentUser.uid)
      : [...product.likes, currentUser.uid];

    update(prodRef, { likes: updatedLikes });
  };

  const handleDislike = (id) => {
    if (!currentUser) return;

    const prodRef = ref(db, `products/${id}`);
    const product = products.find((p) => p.id === id);
    if (!product) return;

    const disliked = product.dislikes.includes(currentUser.uid);
    const updatedDislikes = disliked
      ? product.dislikes.filter((uid) => uid !== currentUser.uid)
      : [...product.dislikes, currentUser.uid];

    update(prodRef, { dislikes: updatedDislikes });
  };

  const handleComment = (id) => {
    const text = commentInputs[id];
    if (!text || !currentUser) return;

    const comment = {
      name: currentUser.displayName || currentUser.email || "Anonymous",
      text,
      timestamp: Date.now(),
    };

    push(ref(db, `products/${id}/comments`), comment);
    setCommentInputs({ ...commentInputs, [id]: "" });
  };

  const handleDeleteProduct = async (id) => {
    // Delete only from Firebase (products node), NOT from imgbb
    try {
      await remove(ref(db, `products/${id}`));
    } catch (error) {
      alert("Failed to delete product: " + error.message);
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

  // Open chat modal with seller UID for private messaging
  const openChatWithSeller = (sellerUID, sellerName) => {
    if (!currentUser) {
      alert("Please login to chat with seller.");
      return;
    }
    if (sellerUID === currentUser.uid) {
      alert("You can't chat with yourself.");
      return;
    }
    setSelectedUser({ uid: sellerUID, name: sellerName });
    setShowChatModal(true);
  };

  return (
    <div style={pageStyle}>
      <div style={backgroundOverlay}>
        <div style={headerStyle}>
          {"AFRIBASE MARKETPLACE".split("").map((char, i) => (
            <span
              key={i}
              style={{
                ...letterStyle,
                animationDelay: `${i * 0.06}s`,
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
                <button
                  onClick={() => openChatWithSeller(p.ownerUID, p.ownerName)}
                  style={waBtnStyle}
                  title="Chat with seller"
                >
                  💬 Chat Seller
                </button>
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
          />
        )}
      </div>
    </div>
  );
}

// Styles

const pageStyle = {
  minHeight: "100vh",
  fontFamily: "'Poppins', sans-serif",
  position: "relative",
  color: "#222",
};

const backgroundOverlay = {
  minHeight: "100vh",
  backgroundImage: "url('/IMG-20250620-WA0007.jpg')",
  backgroundSize: "cover",
  backgroundPosition: "center",
  padding: 20,
  backdropFilter: "brightness(0.7)",
  color: "#fff",
};

const headerStyle = {
  textAlign: "center",
  margin: "30px 0 20px",
  fontWeight: "800",
  display: "flex",
  justifyContent: "center",
  flexWrap: "wrap",
  fontSize: "2.8rem",
  userSelect: "none",
  letterSpacing: "4px",
  textShadow: "2px 2px 6px rgba(0,0,0,0.7)",
};

const letterStyle = {
  background: "linear-gradient(90deg, red, black)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  animation: "fadeIn 0.5s ease forwards",
  opacity: 0,
  userSelect: "none",
};

const searchInput = {
  width: "100%",
  padding: 12,
  fontSize: 16,
  borderRadius: 12,
  marginBottom: 25,
  border: "none",
  outline: "none",
  boxShadow: "0 0 8px rgba(0,0,0,0.5)",
  backgroundColor: "rgba(255,255,255,0.9)",
  color: "#222",
};

const postFormStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
  marginBottom: 30,
  alignItems: "center",
};

const inputStyle = {
  padding: 12,
  fontSize: 14,
  borderRadius: 12,
  border: "none",
  width: "100%",
  boxSizing: "border-box",
  boxShadow: "0 0 8px rgba(0,0,0,0.2)",
  backgroundColor: "#fff",
  color: "#222",
};

const fileInputStyle = {
  gridColumn: "span 2",
  padding: 6,
  borderRadius: 12,
  border: "none",
  boxShadow: "0 0 8px rgba(0,0,0,0.2)",
  backgroundColor: "#fff",
  color: "#222",
};

const buttonStyle = {
  gridColumn: "span 2",
  background: "#00cc88",
  color: "#fff",
  padding: "12px 0",
  borderRadius: 12,
  border: "none",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: 16,
  boxShadow: "0 4px 12px rgba(0,204,136,0.6)",
  transition: "background-color 0.3s ease",
};

const productGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: 25,
};

const cardStyle = {
  background: "rgba(255,255,255,0.95)",
  padding: 20,
  borderRadius: 18,
  boxShadow: "0 6px 14px rgba(0,0,0,0.15)",
  position: "relative",
  color: "#222",
};

const deleteProductStyle = {
  position: "absolute",
  top: 12,
  right: 12,
  fontWeight: "bold",
  fontSize: 22,
  cursor: "pointer",
  color: "red",
  userSelect: "none",
};

const imgStyle = {
  width: "100%",
  height: 180,
  objectFit: "cover",
  borderRadius: 14,
  marginBottom: 14,
  cursor: "pointer",
  transition: "transform 0.3s ease",
};

const socialRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: 14,
};

const emojiBtnStyle = {
  cursor: "pointer",
  marginRight: 18,
  fontWeight: "bold",
  userSelect: "none",
  color: "#333",
};

const waBtnStyle = {
  backgroundColor: "#25D366",
  color: "#fff",
  padding: "8px 14px",
  borderRadius: 10,
  border: "none",
  cursor: "pointer",
  fontWeight: "bold",
  userSelect: "none",
};

const commentToggleBtnStyle = {
  background: "transparent",
  border: "none",
  color: "#007bff",
  cursor: "pointer",
  padding: 0,
  fontSize: 15,
  marginTop: 15,
  userSelect: "none",
};

const commentsListStyle = {
  maxHeight: 130,
  overflowY: "auto",
  marginTop: 8,
  borderTop: "1px solid #ddd",
  paddingTop: 6,
};

const commentStyle = {
  fontSize: 14,
  marginBottom: 8,
  wordBreak: "break-word",
};

const deleteCommentStyle = {
  color: "red",
  cursor: "pointer",
  marginRight: 8,
  userSelect: "none",
};
// Continues from commentInputStyle... const commentInputStyle = { width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ccc", marginTop: 10, boxSizing: "border-box", fontSize: 14, };

const modalOverlay = { position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, };

const modalContent = { background: "#fff", padding: 25, borderRadius: 15, width: "90%", maxWidth: 450, boxSizing: "border-box", textAlign: "center", position: "relative", };

const modalImage = { width: "100%", height: 220, objectFit: "cover", borderRadius: 15, marginBottom: 15, };

const modalCloseBtnStyle = { position: "absolute", top: 10, right: 15, border: "none", background: "transparent", fontSize: 18, cursor: "pointer", color: "#333", userSelect: "none", };

