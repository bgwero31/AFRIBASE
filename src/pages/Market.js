import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref, push, onValue } from "firebase/database";

const IMGBB_API_KEY = "30df4aa05f1af3b3b58ee8a74639e5cf";

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

  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });

  const handlePost = async () => {
    if (!title || !description || !price || !category || !image) {
      return alert("Please fill in all fields.");
    }

    try {
      const base64Image = await toBase64(image);
      const formData = new FormData();
      formData.append("image", base64Image.split(",")[1]);

      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: "POST",
        body: formData
      });

      const data = await res.json();

      if (!data.success) throw new Error("Image upload failed");

      const imageUrl = data.data.url;

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
      alert("✅ Product posted!");
    } catch (error) {
      console.error(error);
      alert("Image upload or post failed. Try again.");
    }
  };

  return (
    <div style={pageStyle}>
      <h2 style={titleStyle}>🛍️ Marketplace</h2>

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
            <div style={{ fontSize: "12px", color: "#aaa", marginTop: "5px" }}>{p.time}</div>
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
