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

  return (
    <div style={pageStyle}>
      <h2 style={gradientTitle}>AFRIBASE MARKETPLACE</h2>

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
        {products.map((p, i) => (
          <div key={i} style={cardStyle}>
            <img src={p.image} alt="product" style={imgStyle} />
            <h3>{p.title}</h3>
            <p>{p.description}</p>
            <strong style={{ color: "#00ffcc" }}>{p.price}</strong>
            <div style={categoryStyle}>📂 {p.category}</div>
            <div style={timeStyle}>{p.time}</div>
            <button style={contactBtn}>📞 Contact Seller</button>
          </div>
        ))}
      </div>
    </div>
  );
}

const pageStyle = {
  padding: "20px",
  background: "#121212",
  color: "#fff",
  minHeight: "100vh",
  fontFamily: "Poppins, sans-serif"
};

const gradientTitle = {
  textAlign: "center",
  fontSize: "32px",
  fontWeight: "900",
  background: "linear-gradient(to right, #00ffcc, #000)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  marginBottom: "30px"
};

const formStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  maxWidth: "400px",
  margin: "0 auto",
  marginBottom: "30px",
  background: "#1e1e1e",
  padding: "20px",
  borderRadius: "10px",
  boxShadow: "0 0 15px #00ffcc20"
};

const inputStyle = {
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #333",
  fontSize: "16px",
  background: "#000",
  color: "#fff"
};

const textareaStyle = {
  ...inputStyle,
  height: "80px",
  resize: "none"
};

const buttonStyle = {
  padding: "14px",
  backgroundColor: "#00ffcc",
  color: "#000",
  fontWeight: "bold",
  fontSize: "16px",
  borderRadius: "8px",
  cursor: "pointer",
  border: "none"
};

const productGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
  gap: "20px"
};

const cardStyle = {
  backgroundColor: "#1a1a1a",
  padding: "15px",
  borderRadius: "12px",
  boxShadow: "0 0 10px #00ffcc30",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between"
};

const imgStyle = {
  width: "100%",
  height: "180px",
  objectFit: "cover",
  borderRadius: "8px",
  marginBottom: "10px"
};

const contactBtn = {
  marginTop: "10px",
  padding: "10px",
  backgroundColor: "#00ffcc",
  color: "#000",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: "600"
};

const categoryStyle = {
  marginTop: "6px",
  fontSize: "14px",
  color: "#00ffcc"
};

const timeStyle = {
  fontSize: "12px",
  color: "#aaa",
  marginTop: "4px"
};
