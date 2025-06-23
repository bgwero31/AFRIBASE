import React, { useState, useEffect } from "react";
import { db, storage } from "../firebase";
import { ref, push, onValue, update, get } from "firebase/database";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import SendPrivateMessage from "../components/SendPrivateMessage"; // ✅ Import modal

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
  const [userVotes, setUserVotes] = useState({}); // track like/dislike toggles

  // For private messaging modal
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState({});

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
    if (!title || !description || !price || !category || !image)
      return alert("Fill all fields");

    try {
      const imgRef = storageRef(storage, `marketplace/${Date.now()}-${image.name}`);
      await uploadBytes(imgRef, image);
      const url = await getDownloadURL(imgRef);

      await push(ref(db, "products"), {
        title,
        description,
        price,
        category,
        image: url,
        time: new Date().toLocaleString(),
        likes: 0,
        dislikes: 0,
        ownerUID: null, // Add dynamically if user login implemented
        ownerName: null,
      });

      setTitle("");
      setDescription("");
      setPrice("");
      setCategory("");
      setImage(null);
    } catch (err) {
      alert("Error uploading product: " + err.message);
    }
  };

  // Toggle like/dislike: click to add, click again to remove
  const handleLike = async (id, delta) => {
    const field = delta > 0 ? "likes" : "dislikes";
    const oppositeField = delta > 0 ? "dislikes" : "likes";
    const productRef = ref(db, `products/${id}`);

    try {
      const snapshot = await get(productRef);
      if (!snapshot.exists()) return;
      const product = snapshot.val();

      let likes = product.likes || 0;
      let dislikes = product.dislikes || 0;

      const currentVote = userVotes[id]; // "like", "dislike", or undefined

      if (currentVote === field) {
        // Undo current vote
        if (field === "likes") likes = Math.max(0, likes - 1);
        else dislikes = Math.max(0, dislikes - 1);
        setUserVotes({ ...userVotes, [id]: null });
      } else {
        // Remove opposite vote if exists
        if (currentVote === oppositeField) {
          if (oppositeField === "likes") likes = Math.max(0, likes - 1);
          else dislikes = Math.max(0, dislikes - 1);
        }
        // Add current vote
        if (field === "likes") likes += 1;
        else dislikes += 1;
        setUserVotes({ ...userVotes, [id]: field });
      }

      await update(productRef, { likes, dislikes });
    } catch (err) {
      console.error("Error updating likes/dislikes:", err);
    }
  };

  const handleComment = async (id) => {
    const text = commentInputs[id];
    if (!text) return;
    try {
      await push(ref(db, `products/${id}/comments`), {
        text,
        time: new Date().toLocaleString(),
      });
      setCommentInputs({ ...commentInputs, [id]: "" });
    } catch (err) {
      alert("Error saving comment: " + err.message);
    }
  };

  const filtered = products.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
  );

  const isDark = darkMode;

  return (
    <div
      style={{
        ...pageStyle,
        background: isDark ? "#121212" : "#f4f4f4",
        color: isDark ? "#fff" : "#000",
      }}
    >
      <button style={toggleBtnStyle(isDark)} onClick={() => setDarkMode(!darkMode)}>
        {isDark ? "☀️" : "🌙"}
      </button>

      <h2 style={headerStyle}>
        {"AFRIBASE MARKETPLACE".split(" ").map((w, i) => (
          <span key={i} style={{ marginRight: "10px" }}>
            {w.split("").map((c, j) => (
              <span
                key={j}
                style={{ ...letterStyle, animationDelay: `${(i + j) * 0.05}s` }}
              >
                {c}
              </span>
            ))}
          </span>
        ))}
      </h2>

      <input
        style={{ ...searchInput, background: isDark ? "#1f1f1f" : "#fff", color: isDark ? "#fff" : "#000" }}
        placeholder="🔍 Search products..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div style={formStyle}>
        <input
          style={inputStyle(isDark)}
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          style={textStyle(isDark)}
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <input
          style={inputStyle(isDark)}
          placeholder="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <select
          style={inputStyle(isDark)}
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
        <input type="file" onChange={(e) => setImage(e.target.files[0])} />
        <button style={buttonStyle} onClick={handlePost}>
          📤 Post
        </button>
      </div>

      <div style={productGrid}>
        {filtered.map((p) => (
          <div key={p.id} style={{ ...cardStyle(isDark) }}>
            <img src={p.image} style={imgStyle} onClick={() => setModal(p)} />
            <h3>{p.title}</h3>
            <p style={{ flexGrow: 1 }}>{p.description}</p>
            <strong style={{ color: "#00ffcc" }}>{p.price}</strong>
            <div style={categoryStyle}>📂 {p.category}</div>
            <div style={{ fontSize: "12px", color: isDark ? "#aaa" : "#555", marginBottom: "8px" }}>
              {p.time}
            </div>

            <div style={socialRowStyle}>
              <div>
                <span onClick={() => handleLike(p.id, 1)} style={emojiBtnStyle}>
                  👍 {p.likes}
                </span>
                <span onClick={() => handleLike(p.id, -1)} style={emojiBtnStyle}>
                  👎 {p.dislikes}
                </span>
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

            <input
              style={commentStyle(isDark)}
              placeholder="💬 Add comment..."
              value={commentInputs[p.id] || ""}
              onChange={(e) => setCommentInputs({ ...commentInputs, [p.id]: e.target.value })}
            />
            <button style={buttonStyle} onClick={() => handleComment(p.id)}>
              Post
            </button>

            {/* Chat Seller Button */}
            <button
              onClick={() => {
                setSelectedUser({
                  uid: p.ownerUID,
                  name: p.ownerName,
                });
                setShowModal(true);
              }}
              style={{
                backgroundColor: "#00ffcc",
                color: "#000",
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

      {/* Product modal */}
      {modal && (
        <div style={modalOverlay} onClick={() => setModal(null)}>
          <div style={modalContent}>
            <img src={modal.image} style={modalImage} />
            <h2>{modal.title}</h2>
            <p>{modal.description}</p>
            <p>📂 {modal.category}</p>
            <p style={{ color: "#00ffcc", fontWeight: "bold" }}>{modal.price}</p>
            <p style={{ fontSize: "12px", color: "#aaa" }}>{modal.time}</p>
            <a href={`https://wa.me/?text=Hi I'm interested`} style={waBtnStyle}>
              💬 WhatsApp
            </a>
          </div>
        </div>
      )}

      {/* SendPrivateMessage Modal */}
      {showModal && (
        <SendPrivateMessage
          recipientUID={selectedUser.uid}
          recipientName={selectedUser.name}
          onClose={() => setShowModal(false)}
          productId={null} // optional if no product context
        />
      )}
    </div>
  );
}

// === Styles (same as before) ...
const toggleBtnStyle = (isDark) => ({
  position: "absolute",
  top: 20,
  right: 20,
  fontSize: 20,
  background: isDark ? "#00ffcc" : "#121212",
  color: isDark ? "#000" : "#fff",
  padding: 10,
  borderRadius: 50,
  border: "none",
  boxShadow: "0 0 10px #00ffcc99",
  zIndex: 2,
});

const pageStyle = {
  padding: 20,
  minHeight: "100vh",
  fontFamily: "Poppins",
  position: "relative",
};
const headerStyle = {
  textAlign: "center",
  margin: "20px 0",
  fontWeight: "800",
  display: "flex",
  justifyContent: "center",
  flexWrap: "wrap",
};
const letterStyle = {
  background: "linear-gradient(to top,#00ffcc,#000)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  animation: "flickerColor 2s infinite",
};
const searchInput = {
  width: "100%",
  maxWidth: 400,
  display: "block",
  margin: "0 auto 20px",
  padding: "10px",
  border: "none",
  borderRadius: 8,
  fontSize: 16,
};
const formStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  maxWidth: "100%",
  padding: "10px",
  margin: "0 auto 20px",
  boxSizing: "border-box",
};
const inputStyle = (isDark) => ({
  padding: 12,
  borderRadius: 8,
  border: "none",
  fontSize: 16,
  background: isDark ? "#1f1f1f" : "#fff",
  color: isDark ? "#fff" : "#000",
});
const textStyle = inputStyle;
const buttonStyle = {
  padding: 10,
  backgroundColor: "#00ffcc",
  color: "#000",
  border: "none",
  borderRadius: 6,
  fontSize: 14,
  cursor: "pointer",
  marginTop: 5,
};
const productGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "14px",
};
const cardStyle = (isDark) => ({
  padding: 12,
  borderRadius: 10,
  boxShadow: "0 0 10px #00ffcc30",
  display: "flex",
  flexDirection: "column",
  background: isDark ? "#1e1e1e" : "#fff",
  color: isDark ? "#fff" : "#000",
});
const imgStyle = {
  width: "100%",
  height: "110px",
  objectFit: "cover",
  borderRadius: 8,
  marginBottom: 8,
  cursor: "pointer",
};
const categoryStyle = { fontSize: 14, color: "#00ffcc", margin: "5px 0" };
const socialRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  background: "rgba(255,255,255,0.06)",
  padding: "8px",
  borderRadius: 8,
  marginTop: 10,
};
const emojiBtnStyle = { cursor: "pointer", marginRight: 10, fontSize: 16 };
const waBtnStyle = {
  backgroundColor: "#25D366",
  color: "#fff",
  padding: "6px 12px",
  borderRadius: 20,
  textDecoration: "none",
  fontSize: 14,
  fontWeight: "500",
};
const commentStyle = (isDark) => ({ ...inputStyle(isDark), marginTop: 10 });
const modalOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0,0,0,0.7)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 10,
};
const modalContent = {
  background: "#1e1e1e",
  padding: 20,
  borderRadius: 10,
  maxWidth: "90%",
  maxHeight: "90%",
  color: "#fff",
  overflowY: "auto",
  textAlign: "center",
};
const modalImage = {
  width: "100%",
  maxHeight: 300,
  objectFit: "contain",
  borderRadius: 8,
  marginBottom: 20,
};
