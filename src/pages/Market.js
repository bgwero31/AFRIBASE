// Marketplace.js
import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  ref,
  push,
  onValue,
  update,
  remove,
  set,
  get,
} from "firebase/database";
import { getAuth } from "firebase/auth";
import SendPrivateMessage from "../components/SendPrivateMessage";

const imgbbKey = "30df4aa05f1af3b3b58ee8a74639e5cf";

export default function Marketplace() {
  const auth = getAuth();
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
  const [userWhatsApp, setUserWhatsApp] = useState("");

  // Ask for WhatsApp on first load
  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      const phoneRef = ref(db, `users/${user.uid}/whatsapp`);
      get(phoneRef).then((snap) => {
        if (!snap.exists()) {
          const phone = prompt(
            "Enter your WhatsApp number (with country code, e.g. 2637...)"
          );
          if (phone) {
            set(phoneRef, phone);
            setUserWhatsApp(phone);
          }
        } else {
          setUserWhatsApp(snap.val());
        }
      });
    }
  }, []);

  // Load products
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
            ? Object.entries(val.comments).map(([cid, c]) => ({
                id: cid,
                ...c,
              }))
            : [],
        }));
        setProducts(items.reverse());
      }
    });
  }, []);

  const handlePost = async () => {
    const user = auth.currentUser;
    if (!user || !userWhatsApp)
      return alert("Login and provide WhatsApp number.");

    if (!title || !description || !price || !category || !image)
      return alert("Fill all fields.");
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("image", image);
      const res = await fetch(
        `https://api.imgbb.com/1/upload?key=${imgbbKey}`,
        {
          method: "POST",
          body: formData,
        }
      );
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
        ownerName: user.displayName || "Unknown",
        ownerPhoneNumber: userWhatsApp,
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

  const handleComment = (productId) => {
    const user = auth.currentUser;
    const text = commentInputs[productId];
    if (!user || !text) return;

    const comment = {
      name: user.displayName || "User",
      text,
      uid: user.uid,
      timestamp: Date.now(),
    };
    push(ref(db, `products/${productId}/comments`), comment);
    setCommentInputs({ ...commentInputs, [productId]: "" });
  };

  const deleteProduct = (id) => {
    const confirm = window.confirm("Delete this product?");
    if (confirm) {
      remove(ref(db, `products/${id}`));
    }
  };

  const deleteComment = (productId, commentId) => {
    remove(ref(db, `products/${productId}/comments/${commentId}`));
  };

  const toggleLike = (p) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return alert("Login first");
    const liked = p.likes.includes(uid);
    const newLikes = liked
      ? p.likes.filter((id) => id !== uid)
      : [...p.likes, uid];
    update(ref(db, `products/${p.id}`), { likes: newLikes });
  };

  const toggleDislike = (p) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return alert("Login first");
    const dis = p.dislikes.includes(uid);
    const newDislikes = dis
      ? p.dislikes.filter((id) => id !== uid)
      : [...p.dislikes, uid];
    update(ref(db, `products/${p.id}`), { dislikes: newDislikes });
  };

  const getWhatsAppLink = (number, title) => {
    const text = encodeURIComponent(`Hi, I'm interested in ${title}`);
    return `https://wa.me/${number}?text=${text}`;
  };

  const filtered = products.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: 20 }}>
      <input
        style={{ width: "100%", padding: 10 }}
        placeholder="🔍 Search products..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Form */}
      <div>
        <input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <input
          placeholder="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Select Category</option>
          <option value="Electronics">📱 Electronics</option>
          <option value="Clothing">👗 Clothing</option>
          <option value="Food">🍔 Food</option>
          <option value="Vehicles">🚗 Vehicles</option>
        </select>
        <input type="file" onChange={(e) => setImage(e.target.files[0])} />
        <button onClick={handlePost}>
          {uploading ? "Uploading..." : "Post"}
        </button>
      </div>

      {/* Products */}
      <div>
        {filtered.map((p) => (
          <div
            key={p.id}
            style={{
              border: "1px solid #ccc",
              borderRadius: 10,
              padding: 10,
              marginTop: 20,
            }}
          >
            {auth.currentUser?.uid === p.ownerUID && (
              <button onClick={() => deleteProduct(p.id)}>❌</button>
            )}
            <img
              src={p.image}
              alt={p.title}
              style={{ width: "100%", height: 200, objectFit: "cover" }}
              onClick={() => setModal(p)}
            />
            <h3>{p.title}</h3>
            <p>{p.description}</p>
            <strong style={{ color: "green" }}>{p.price}</strong>
            <div>📂 {p.category}</div>
            <p style={{ fontSize: 12 }}>{p.time}</p>

            {/* Likes */}
            <div>
              <button onClick={() => toggleLike(p)}>👍 {p.likes.length}</button>
              <button onClick={() => toggleDislike(p)}>
                👎 {p.dislikes.length}
              </button>
            </div>

            {/* Comments */}
            <div>
              <button
                onClick={() =>
                  setShowComments({ ...showComments, [p.id]: !showComments[p.id] })
                }
              >
                💬 Comments ({p.comments.length})
              </button>
              {showComments[p.id] && (
                <div>
                  {p.comments.map((c) => (
                    <p key={c.id}>
                      <strong>{c.name}</strong>: {c.text}{" "}
                      {auth.currentUser?.uid === c.uid && (
                        <span
                          onClick={() => deleteComment(p.id, c.id)}
                          style={{ color: "red", cursor: "pointer" }}
                        >
                          ❌
                        </span>
                      )}
                    </p>
                  ))}
                  <input
                    placeholder="Write comment..."
                    value={commentInputs[p.id] || ""}
                    onChange={(e) =>
                      setCommentInputs({
                        ...commentInputs,
                        [p.id]: e.target.value,
                      })
                    }
                  />
                  <button onClick={() => handleComment(p.id)}>Post</button>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <a
                href={getWhatsAppLink(p.ownerPhoneNumber, p.title)}
                target="_blank"
                rel="noreferrer"
                style={{ background: "#25D366", padding: 6, borderRadius: 6, color: "white" }}
              >
                WhatsApp Seller
              </a>
              <button
                style={{ background: "#007bff", color: "#fff", padding: 6, borderRadius: 6 }}
                onClick={() => {
                  setSelectedUser({ uid: p.ownerUID, name: p.ownerName });
                  setShowModal(true);
                }}
              >
                Chat Seller
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Image Zoom Modal */}
      {modal && (
        <div
          onClick={() => setModal(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.8)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 999,
          }}
        >
          <img
            src={modal.image}
            style={{
              maxWidth: "90%",
              maxHeight: "90%",
              borderRadius: 10,
              boxShadow: "0 0 20px #000",
            }}
            alt="Zoom"
          />
        </div>
      )}

      {/* Private Inbox Modal */}
      {showModal && selectedUser && (
        <SendPrivateMessage
          recipientUID={selectedUser.uid}
          recipientName={selectedUser.name}
          onClose={() => setShowModal(false)}
          productId={null}
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
