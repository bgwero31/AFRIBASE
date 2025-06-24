// Marketplace.js
import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref, push, onValue, update, remove } from "firebase/database";
import { getAuth } from "firebase/auth";
import SendPrivateMessage from "../components/SendPrivateMessage";
import styles from "./Marketplace.module.css";

const imgbbKey = "30df4aa05f1af3b3b58ee8a74639e5cf";

export default function Marketplace() {
  const [products, setProducts] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [images, setImages] = useState([]);
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
          comments: val.comments || {},
        }));
        setProducts(items.reverse());
      }
    });
  }, []);

  const handlePost = async () => {
    if (!title || !description || !price || !category || images.length === 0) {
      return alert("Fill all fields and select at least 1 image");
    }

    const user = auth.currentUser;
    if (!user) return alert("Please login to post products.");
    setUploading(true);

    try {
      const uploadedImgs = [];

      for (const img of images) {
        const formData = new FormData();
        formData.append("image", img);
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        uploadedImgs.push({ url: data.data.url, deleteUrl: data.data.delete_url });
      }

      await push(ref(db, "products"), {
        title,
        description,
        price,
        category,
        images: uploadedImgs,
        time: new Date().toLocaleString(),
        likes: [],
        dislikes: [],
        comments: {},
        ownerUID: user.uid,
        ownerName: user.displayName || "Unknown",
      });

      setTitle("");
      setDescription("");
      setPrice("");
      setCategory("");
      setImages([]);
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleLike = (id) => {
    const user = auth.currentUser;
    if (!user) return;

    const product = products.find((p) => p.id === id);
    if (!product) return;

    const liked = product.likes.includes(user.uid);
    const newLikes = liked
      ? product.likes.filter((uid) => uid !== user.uid)
      : [...product.likes, user.uid];

    update(ref(db, `products/${id}`), { likes: newLikes });
  };

  const handleDislike = (id) => {
    const user = auth.currentUser;
    if (!user) return;

    const product = products.find((p) => p.id === id);
    if (!product) return;

    const disliked = product.dislikes.includes(user.uid);
    const newDislikes = disliked
      ? product.dislikes.filter((uid) => uid !== user.uid)
      : [...product.dislikes, user.uid];

    update(ref(db, `products/${id}`), { dislikes: newDislikes });
  };

  const handleComment = (id) => {
    const text = commentInputs[id];
    const user = auth.currentUser;
    if (!text || !user) return;

    const comment = {
      name: user.displayName || "User",
      text,
      timestamp: Date.now(),
    };

    push(ref(db, `products/${id}/comments`), comment);
    setCommentInputs({ ...commentInputs, [id]: "" });
  };

  const handleDeleteProduct = async (id) => {
    const user = auth.currentUser;
    const product = products.find((p) => p.id === id);
    if (!product || user?.uid !== product.ownerUID) return;

    try {
      for (const img of product.images || []) {
        if (img.deleteUrl) await fetch(img.deleteUrl);
      }
      await remove(ref(db, `products/${id}`));
    } catch (e) {
      alert("Failed to delete: " + e.message);
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

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        {"AFRIBASE MARKETPLACE".split("").map((char, i) => (
          <span key={i} className={styles.letter} style={{ animationDelay: `${i * 0.05}s` }}>
            {char}
          </span>
        ))}
      </div>

      <input
        className={styles.searchInput}
        placeholder="🔍 Search products..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className={styles.postForm}>
        <input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={styles.input}
        />
        <input
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={styles.input}
        />
        <input
          placeholder="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className={styles.input}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={styles.select}>
          <option value="">Category</option>
          <option value="Electronics">📱 Electronics</option>
          <option value="Clothing">👗 Clothing</option>
          <option value="Food">🍲 Food</option>
          <option value="Vehicles">🚗 Vehicles</option>
          <option value="Other">🔧 Other</option>
        </select>
        <input
          type="file"
          multiple
          onChange={(e) => setImages(Array.from(e.target.files))}
          className={styles.fileInput}
        />
        <button onClick={handlePost} disabled={uploading} className={styles.postButton}>
          {uploading ? "Uploading..." : "📤 Post"}
        </button>
      </div>

      <div className={styles.productGrid}>
        {filtered.map((p) => (
          <div key={p.id} className={styles.card}>
            {auth.currentUser?.uid === p.ownerUID && (
              <div
                className={styles.deleteProduct}
                onClick={() => handleDeleteProduct(p.id)}
                title="Delete product"
              >
                ❌
              </div>
            )}

            {(p.images || []).map((img, i) => (
              <img key={i} src={img.url} alt={p.title} className={styles.productImage} />
            ))}

            <h3 className={styles.productTitle}>{p.title}</h3>
            <p className={styles.productDescription}>{p.description}</p>
            <strong className={styles.productPrice}>{p.price}</strong>
            <div className={styles.productCategory}>📂 {p.category}</div>
            <div className={styles.productTime}>{p.time}</div>

            <div className={styles.socialRow}>
              <div>
                <span onClick={() => handleLike(p.id)} className={styles.emojiBtn}>
                  👍 {p.likes.length}
                </span>
                <span onClick={() => handleDislike(p.id)} className={styles.emojiBtn}>
                  👎 {p.dislikes.length}
                </span>
              </div>
              <a
                href={`https://wa.me/?text=Hi I'm interested in your ${encodeURIComponent(p.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.waBtn}
              >
                💬 WhatsApp
              </a>
            </div>

            <div className={styles.commentSection}>
              <button
                onClick={() =>
                  setShowComments({ ...showComments, [p.id]: !showComments[p.id] })
                }
                className={styles.commentToggle}
              >
                💬 Comments ({Object.keys(p.comments).length})
              </button>

              {showComments[p.id] && (
                <div className={styles.commentsList}>
                  {Object.entries(p.comments).map(([key, c]) => (
                    <p key={key} className={styles.comment}>
                      <span
                        onClick={() => handleDeleteComment(p.id, key)}
                        className={styles.deleteComment}
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
                placeholder="Add a comment..."
                value={commentInputs[p.id] || ""}
                onChange={(e) => setCommentInputs({ ...commentInputs, [p.id]: e.target.value })}
                className={styles.commentInput}
              />
              <button onClick={() => handleComment(p.id)} className={styles.postCommentBtn}>
                Post
              </button>
            </div>

            <button
              onClick={() => {
                setSelectedUser({ uid: p.ownerUID, name: p.ownerName });
                setShowModal(true);
              }}
              className={styles.chatSellerBtn}
            >
              Chat Seller
            </button>
          </div>
        ))}
      </div>

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
