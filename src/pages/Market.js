import React, { useState, useEffect } from "react";
import { db, storage } from "../firebase";
import { ref, push, onValue } from "firebase/database";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

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

  useEffect(() => {
    const productRef = ref(db, "products");
    onValue(productRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const productArray = Object.values(data);
        setProducts(productArray.reverse());
      }
    });
  }, []);

  const handlePost = async () => {
    if (!title || !description || !price || !category || !image) {
      return alert("Please fill in all fields.");
    }

    const imgRef = storageRef(storage, `marketplace/${Date.now()}-${image.name}`);
    await uploadBytes(imgRef, image);
    const imageUrl = await getDownloadURL(imgRef);

    push(ref(db, "products"), {
      title,
      description,
      price,
      category,
      image: imageUrl,
      time: new Date().toLocaleString()
    });

    setTitle("");
    setDescription("");
    setPrice("");
    setCategory("");
    setImage(null);
    alert("Product posted!");
  };

  const filteredProducts = products.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  const isDark = darkMode;

  const toggleIcon = {
    position: "absolute",
    top: 20,
    right: 20,
    fontSize: "20px",
    cursor: "pointer",
    backgroundColor: isDark ? "#00ffcc" : "#121212",
    color: isDark ? "#000" : "#fff",
    padding: "10px",
    borderRadius: "50%",
    border: "none",
    boxShadow: "0 0 10px #00ffcc99",
    zIndex: 2
  };

  return (
    <div style={{ ...pageStyle, background: isDark ? "#121212" : "#f4f4f4", color: isDark ? "#fff" : "#000" }}>
      <button style={toggleIcon} onClick={() => setDarkMode(!darkMode)}>
        {darkMode ? "☀️" : "🌙"}
      </button>

      <h2 style={headerStyle}>
        {"AFRIBASE MARKETPLACE".split("").map((char, i) => (
          <span key={i} style={{ ...letterStyle, animationDelay: `${i * 0.1}s` }}>
            {char}
          </span>
        ))}
      </h2>

      <input
        style={{ ...searchInput, backgroundColor: isDark ? "#1f1f1f" : "#fff", color: isDark ? "#fff" : "#000" }}
        placeholder="🔍 Search products..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div style={formStyle}>
        <input style={inputStyle} placeholder="Product Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea style={textareaStyle} placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <input style={inputStyle} placeholder="Price (e.g. $25)" value={price} onChange={(e) => setPrice(e.target.value)} />
        <select style={inputStyle} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Select Category</option>
          <option value="Electronics">📱 Electronics</option>
          <option value="Clothing">👗 Clothing</option>
          <option value="Food">🍲 Food</option>
          <option value="Vehicles">🚗 Vehicles</option>
          <option value="Other">🔧 Other</option>
        </select>
        <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files[0])} />
        <button style={buttonStyle} onClick={handlePost}>📤 Post Product</button>
      </div>

      <div style={productGrid}>
        {filteredProducts.map((p, i) => (
          <div key={i} style={{ ...cardStyle, backgroundColor: isDark ? "#1e1e1e" : "#fff", color: isDark ? "#fff" : "#000" }}>
            <img
              src={p.image}
              alt="product"
              style={imgStyle}
              onClick={() => setModal(p)}
            />
            <h3>{p.title}</h3>
            <p>{p.description}</p>
            <strong style={{ color: "#00ffcc" }}>{p.price}</strong>
            <div style={categoryStyle}>📂 {p.category}</div>
            <div style={{ fontSize: "12px", color: isDark ? "#aaa" : "#555", marginTop: "5px" }}>{p.time}</div>
            <button style={contactBtn}>📞 Contact Seller</button>
          </div>
        ))}
      </div>

      {modal && (
        <div style={modalOverlay} onClick={() => setModal(null)}>
          <div style={modalContent} onClick={e => e.stopPropagation()}>
            <img src={modal.image} alt="product" style={modalImage} />
            <h2>{modal.title}</h2>
            <p>{modal.description}</p>
            <p>📂 {modal.category}</p>
            <p style={{ fontWeight: "bold", color: "#00ffcc" }}>{modal.price}</p>
            <p style={{ fontSize: "12px", color: "#aaa" }}>{modal.time}</p>
            <button style={contactBtn}>📞 Contact Seller</button>
          </div>
        </div>
      )}
    </div>
  );
}

// === Styles ===
const pageStyle = {
  padding: "20px",
  minHeight: "100vh",
  fontFamily: "Poppins, sans-serif",
  position: "relative"
};

const headerStyle = {
  textAlign: "center",
  marginBottom: "25px",
  fontSize: "34px",
  fontWeight: "900",
  letterSpacing: "2px",
  display: "flex",
  justifyContent: "center",
  flexWrap: "wrap"
};

const letterStyle = {
  display: "inline-block",
  background: "linear-gradient(to top, #00ffcc, #000)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  animation: "flickerColor 2s infinite",
  fontFamily: "Poppins, sans-serif"
};

const searchInput = {
  width: "100%",
  maxWidth: "400px",
  margin: "0 auto 20px",
  display: "block",
  padding: "10px 14px",
  borderRadius: "8px",
  border: "none",
  fontSize: "16px"
};

const formStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  maxWidth: "400px",
  margin: "0 auto",
  marginBottom: "30px"
};

const inputStyle = {
  padding: "12px",
  borderRadius: "8px",
  border: "none",
  fontSize: "16px",
  backgroundColor: "#1f1f1f",
  color: "#fff"
};

const textareaStyle = {
  ...inputStyle,
  height: "80px",
  resize: "none"
};

const buttonStyle = {
  padding: "12px",
  backgroundColor: "#00ffcc",
  border: "none",
  fontWeight: "bold",
  fontSize: "16px",
  cursor: "pointer",
  borderRadius: "8px",
  color: "#000"
};

const productGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
  gap: "20px"
};

const cardStyle = {
  padding: "15px",
  borderRadius: "12px",
  boxShadow: "0 0 10px #00ffcc30",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  cursor: "pointer"
};

const imgStyle = {
  width: "100%",
  height: "160px",
  objectFit: "cover",
  borderRadius: "8px",
  marginBottom: "10px"
};

const contactBtn = {
  marginTop: "10px",
  padding: "8px",
  backgroundColor: "#00ffcc",
  color: "#000",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: "600"
};

const categoryStyle = {
  marginTop: "8px",
  fontSize: "14px",
  color: "#00ffcc"
};

const modalOverlay = {
  position: "fixed",
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: "rgba(0,0,0,0.7)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 10
};

const modalContent = {
  backgroundColor: "#1e1e1e",
  color: "#fff",
  padding: "30px",
  borderRadius: "10px",
  maxWidth: "90%",
  maxHeight: "90%",
  overflowY: "auto",
  textAlign: "center"
};

const modalImage = {
  width: "100%",
  maxHeight: "300px",
  objectFit: "contain",
  borderRadius: "8px",
  marginBottom: "20px"
};
