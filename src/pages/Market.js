// Marketplace.js
import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref, push, onValue, remove, update } from "firebase/database";
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
          comments: val.comments
            ? Object.entries(val.comments).map(([cid, c]) => ({ id: cid, ...c }))
            : [],
        }));
        setProducts(items.reverse());
      }
    });
  }, []);

  const handlePost = async () => {
    if (!title || !description || !price || !category || !image) {
      return alert("Fill all fields");
    }

    const user = auth.currentUser;
    if (!user) return alert("Login to post");

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", image);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      const url = data.data.url;

      await push(ref(db, "products"), {
        title,
        description,
        price,
        category,
        image: url,
        time: new Date().toLocaleString(),
        likes: [],
        dislikes: [],
        comments: [],
        ownerUID: user.uid,
        ownerName: user.displayName || "User",
        ownerPhoneNumber: user.phoneNumber || "",
      });

      setTitle("");
      setDescription("");
      setPrice("");
      setCategory("");
      setImage(null);
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const toggleLike = async (product) => {
    const user = auth.currentUser;
    if (!user) return;
    const userId = user.uid;
    let likes = product.likes || [];
    let dislikes = product.dislikes || [];

    if (likes.includes(userId)) {
      likes = likes.filter((id) => id !== userId);
    } else {
      likes.push(userId);
      dislikes = dislikes.filter((id) => id !== userId);
    }

    await update(ref(db, `products/${product.id}`), { likes, dislikes });
  };

  const toggleDislike = async (product) => {
    const user = auth.currentUser;
    if (!user) return;
    const userId = user.uid;
    let likes = product.likes || [];
    let dislikes = product.dislikes || [];

    if (dislikes.includes(userId)) {
      dislikes = dislikes.filter((id) => id !== userId);
    } else {
      dislikes.push(userId);
      likes = likes.filter((id) => id !== userId);
    }

    await update(ref(db, `products/${product.id}`), { likes, dislikes });
  };

  const handleComment = (id) => {
    const text = commentInputs[id];
    const user = auth.currentUser;
    if (!text || !user) return;

    const comment = {
      name: user.displayName || "User",
      text,
      uid: user.uid,
      timestamp: Date.now(),
    };

    push(ref(db, `products/${id}/comments`), comment);
    setCommentInputs({ ...commentInputs, [id]: "" });
  };

  const deleteComment = (productId, commentId) => {
    remove(ref(db, `products/${productId}/comments/${commentId}`));
  };

  const deleteProduct = (id) => {
    const confirmDelete = window.confirm("Delete this product?");
    if (confirmDelete) {
      remove(ref(db, `products/${id}`));
    }
  };

  const getWhatsAppLink = (number, title) => {
    const phone = number?.replace(/\D/g, "");
    const text = encodeURIComponent(`Hello, I'm interested in "${title}"`);
    return `https://wa.me/${phone}?text=${text}`;
  };

  const filtered = products.filter((p) =>
    (p.title + p.description).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={styles.page}>
      <input
        style={styles.search}
        placeholder="🔍 Search..."
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
        <input type="file" onChange={(e) => setImage(e.target.files[0])} />
        <button onClick={handlePost} disabled={uploading}>{uploading ? "Uploading..." : "Post"}</button>
      </div>

      <div style={styles.grid}>
        {filtered.map((p) => (
          <div key={p.id} style={styles.card}>
            {auth.currentUser?.uid === p.ownerUID && (
              <button onClick={() => deleteProduct(p.id)} style={styles.close}>❌</button>
            )}
            <img
              src={p.image}
              alt={p.title}
              style={styles.image}
              onClick={() => setModal(p)}
            />
            <h3>{p.title}</h3>
            <p>{p.description}</p>
            <p style={{ color: "#00cc88" }}>{p.price}</p>
            <div>📂 {p.category}</div>
            <div style={{ fontSize: 12 }}>{p.time}</div>

            <div>
              <button onClick={() => toggleLike(p)}>👍 {p.likes.length}</button>
              <button onClick={() => toggleDislike(p)}>👎 {p.dislikes.length}</button>
              <button onClick={() => {
                setSelectedUser({ uid: p.ownerUID, name: p.ownerName });
                setShowModal(true);
              }}>Chat Seller</button>
              <a href={getWhatsAppLink(p.ownerPhoneNumber, p.title)} target="_blank" rel="noopener noreferrer">
                WhatsApp Seller
              </a>
            </div>

            <div>
              <button onClick={() => setShowComments({ ...showComments, [p.id]: !showComments[p.id] })}>
                💬 {p.comments.length} Comments
              </button>
              {showComments[p.id] && (
                <div style={{ maxHeight: 100, overflowY: "auto" }}>
                  {p.comments.map((c) => (
                    <p key={c.id}>
                      <strong>{c.name}</strong>: {c.text}
                      {auth.currentUser?.uid === c.uid && (
                        <span onClick={() => deleteComment(p.id, c.id)} style={{ color: "red", cursor: "pointer" }}>
                          ❌
                        </span>
                      )}
                    </p>
                  ))}
                </div>
              )}
              <input
                placeholder="Add comment..."
                value={commentInputs[p.id] || ""}
                onChange={(e) =>
                  setCommentInputs({ ...commentInputs, [p.id]: e.target.value })
                }
              />
              <button onClick={() => handleComment(p.id)}>Post</button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div style={styles.overlay} onClick={() => setModal(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <img src={modal.image} alt="Zoom" style={{ width: "100%", borderRadius: 10 }} />
            <h2>{modal.title}</h2>
            <p>{modal.description}</p>
          </div>
        </div>
      )}

      {showModal && selectedUser && (
        <SendPrivateMessage
          recipientUID={selectedUser.uid}
          recipientName={selectedUser.name}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

const styles = {
  page: {
    padding: 20,
    minHeight: "100vh",
    background: "white",
    fontFamily: "Poppins",
  },
  search: {
    width: "100%",
    padding: 10,
    fontSize: 16,
    marginBottom: 10,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
    gap: 20,
  },
  card: {
    background: "#fff",
    borderRadius: 12,
    padding: 10,
    boxShadow: "0 0 5px rgba(0,0,0,0.1)",
    position: "relative",
  },
  image: {
    width: "100%",
    height: 200,
    objectFit: "cover",
    borderRadius: 10,
    cursor: "zoom-in",
  },
  close: {
    position: "absolute",
    top: 5,
    right: 5,
    background: "red",
    color: "#fff",
    border: "none",
    borderRadius: "50%",
    cursor: "pointer",
    fontWeight: "bold",
  },
  overlay: {
    position: "fixed",
    top: 0, left: 0,
    width: "100vw",
    height: "100vh",
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    background: "#fff",
    padding: 20,
    borderRadius: 10,
    width: "90%",
    maxWidth: 400,
  },
};
