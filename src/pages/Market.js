import React, { useState, useEffect } from "react";
import { db, storage } from "../firebase";
import { ref, push, onValue } from "firebase/database";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

export default function Marketplace() {
  const [products, setProducts] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
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
    if (!title || !description || !price || !image) return alert("Please fill in all fields.");

    const imgRef = storageRef(storage, `marketplace/${Date.now()}-${image.name}`);
    await uploadBytes(imgRef, image);
    const imageUrl = await getDownloadURL(imgRef);

    push(ref(db, "products"), {
      title,
      description,
      price,
      image: imageUrl,
      time: new Date().toLocaleString()
    });

    setTitle("");
    setDescription("");
    setPrice("");
    setImage(null);
    alert("Product posted!");
  };

  return (
    <div style={pageStyle}>
      <h2 style={titleStyle}>🛍️ Marketplace</h2>

      <div style={formStyle}>
        <input style={inputStyle} placeholder="Product Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea style={textareaStyle} placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <input style={inputStyle} placeholder="Price (e.g. $25)" value={price} onChange={(e) => setPrice(e.target.value)} />
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
            <div style={{ fontSize: "12px", color: "#aaa", marginTop: "5px" }}>{p.time}</div>
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

const titleStyle = {
  textAlign: "center",
  color: "#00ffcc"
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
  padding: "10px",
  borderRadius: "6px",
  border: "none",
  fontSize: "16px"
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
  borderRadius: "6px"
};

const productGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
  gap: "20px"
};

const cardStyle = {
  backgroundColor: "#1e1e1e",
  padding: "15px",
  borderRadius: "10px",
  boxShadow: "0 0 10px #00ffcc30"
};

const imgStyle = {
  width: "100%",
  height: "160px",
  objectFit: "cover",
  borderRadius: "6px",
  marginBottom: "10px"
};
