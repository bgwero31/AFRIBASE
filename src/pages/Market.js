import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref, push, onValue } from "firebase/database";

const IMGBB_API_KEY = "30df4aa05f1af3b3b58ee8a74639e5cf";

export default function Marketplace() {
  const [products, setProducts] = useState([]);
  const [display, setDisplay] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [image, setImage] = useState(null);
  const [filterCat, setFilterCat] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const productRef = ref(db, "products");
    onValue(productRef, (snapshot) => {
      const data = snapshot.val();
      const arr = data ? Object.values(data).reverse() : [];
      setProducts(arr);
      setDisplay(arr);
    });
  }, []);

  const handleSearch = () => {
    let filtered = products;
    if (filterCat) {
      filtered = filtered.filter(p => p.category === filterCat);
    }
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setDisplay(filtered);
  };

  const toBase64 = file => new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result);
    reader.onerror = err => rej(err);
    reader.readAsDataURL(file);
  });

  const handlePost = async () => {
    if (!title || !description || !price || !category || !image) {
      return alert("Fill in all fields.");
    }
    try {
      const base64 = await toBase64(image);
      const form = new FormData();
      form.append("image", base64.split(",")[1]);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: form });
      const data = await res.json();
      if (!data.success) throw new Error("ImgBB failed");
      const imageUrl = data.data.url;

      await push(ref(db, "products"), {
        title, description, price, category, image: imageUrl,
        time: new Date().toLocaleString()
      });

      // Reset form
      setTitle(""); setDescription(""); setPrice("");
      setCategory(""); setImage(null);
      handleSearch();
      alert("Product posted!");
    } catch (e) {
      console.error(e);
      alert("Post failed – check console.");
    }
  };

  return (
    <div style={pageStyle}>
      <h2 style={titleStyle}>🛍️ Marketplace</h2>

      {/* Post Product Form */}
      <div style={formStyle}>
        <input placeholder="Product Title" style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} />
        <textarea placeholder="Description" style={inputStyle} value={description} onChange={e => setDescription(e.target.value)} />
        <input placeholder="Price (e.g. 25)" style={inputStyle} value={price} onChange={e => setPrice(e.target.value)} />
        <select style={inputStyle} value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">Category...</option>
          <option value="Electronics">Electronics</option>
          <option value="Clothing">Clothing</option>
          <option value="Food">Food</option>
          <option value="Vehicles">Vehicles</option>
          <option value="Other">Other</option>
        </select>
        <input type="file" accept="image/*" onChange={e => setImage(e.target.files[0])} />
        <button style={buttonStyle} onClick={handlePost}>📤 Post Product</button>
      </div>

      {/* Filters */}
      <div style={filterStyle}>
        <select style={inputStyle} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">All Categories</option>
          <option value="Electronics">Electronics</option>
          <option value="Clothing">Clothing</option>
          <option value="Food">Food</option>
          <option value="Vehicles">Vehicles</option>
          <option value="Other">Other</option>
        </select>
        <input placeholder="Search..." style={inputStyle} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        <button style={buttonStyle} onClick={handleSearch}>🔍 Filter</button>
      </div>

      {/* Product Grid */}
      <div style={gridStyle}>
        {display.map((p,i) => (
          <div key={i} style={cardStyle}>
            <img src={p.image} alt="product" style={imgStyle} />
            <h3>{p.title}</h3>
            <p>{p.description}</p>
            <strong style={{ color: "#00ffcc" }}>{p.price}</strong>
            <div style={categoryStyle}>{p.category}</div>
            <div style={{ fontSize:12, color:"#aaa" }}>{p.time}</div>
            <button style={contactBtn}>📞 Contact Seller</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Styles – same as before, including filterStyle
const pageStyle = { /* ... */ };
const titleStyle = { /* ... */ };
const formStyle = { /* ... */ };
const inputStyle = { /* ... */ };
const buttonStyle = { /* ... */ };
const filterStyle = {
  display: "flex", gap: "10px", maxWidth: "400px",
  margin: "0 auto", marginBottom: "20px"
};
const gridStyle = { /* ... */ };
const cardStyle = { /* ... */ };
const imgStyle = { /* ... */ };
const contactBtn = { /* ... */ };
const categoryStyle = { /* ... */ };
