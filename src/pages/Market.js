import React from "react";
import products from "../data/products";

export default function Market() {
  return (
    <div style={container}>
      <h2 style={heading}>🛍️ Afribase Marketplace</h2>
      <div style={grid}>
        {products.map((item) => (
          <div key={item.id} style={card}>
            <img src={item.image} alt={item.title} style={image} />
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            <p style={price}>💵 {item.price}</p>
            <button style={btn}>Contact Seller</button>
          </div>
        ))}
      </div>
    </div>
  );
}

const container = {
  padding: "20px",
  fontFamily: "Poppins, sans-serif",
  background: "#121212",
  color: "#fff",
  minHeight: "100vh"
};

const heading = {
  textAlign: "center",
  marginBottom: "20px",
  color: "#00ffcc"
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
  gap: "20px"
};

const card = {
  background: "#1e1e1e",
  padding: "16px",
  borderRadius: "12px",
  boxShadow: "0 0 10px rgba(0,255,204,0.2)",
  textAlign: "center"
};

const image = {
  width: "100%",
  borderRadius: "10px",
  marginBottom: "10px"
};

const price = {
  fontWeight: "bold",
  marginTop: "10px",
  color: "#00ffcc"
};

const btn = {
  marginTop: "10px",
  padding: "10px 20px",
  border: "none",
  borderRadius: "6px",
  backgroundColor: "#00ffcc",
  color: "#000",
  fontWeight: "bold",
  cursor: "pointer"
};
