// src/pages/Marketplace.js
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
  const [images, setImages] = useState([]); // Array of selected files
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

  // Handle multiple image selection
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files).slice(0, 3); // max 3 files
    setImages(files);
  };

  const handlePost = async () => {
    if (!title || !description || !price || !category || images.length === 0) {
      return alert("Please fill all fields and select at least one image.");
    }

    const user = auth.currentUser;
    if (!user) return alert("Please login to post products.");

    setUploading(true);

    try {
      // Upload each image to imgbb, collect URLs & delete URLs
      const uploadPromises = images.map(async (img) => {
        const formData = new FormData();
        formData.append("image", img);
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        return { url: data.data.url, deleteUrl: data.data.delete_url };
      });

      const uploadedImages = await Promise.all(uploadPromises);

      // Push product with images array
      await push(ref(db, "products"), {
        title,
        description,
        price,
        category,
        images: uploadedImages,
        time: new Date().toLocaleString(),
        likes: [],
        dislikes: [],
        comments: {},
        ownerUID: user.uid,
        ownerName: user.displayName || "Unknown",
      });

      // Clear inputs
      setTitle("");
      setDescription("");
      setPrice("");
      setCategory("");
      setImages([]);
    } catch (err) {
      alert("Image upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleLike = (id) => {
    const user = auth.currentUser;
    if (!user) return;
    const prodRef = ref(db, `products/${id}`);
    const product = products.find((p) => p.id === id);
    if (!product) return;

    const liked = product.likes.includes(user.uid);
    const updatedLikes = liked
      ? product.likes.filter((uid) => uid !== user.uid)
      : [...product.likes, user.uid];

    update(prodRef, { likes: updatedLikes });
  };

  const handleDislike = (id) => {
    const user = auth.currentUser;
    if (!user) return;
    const prodRef = ref(db, `products/${id}`);
    const product = products.find((p) => p.id === id);
    if (!product) return;

    const disliked = product.dislikes.includes(user.uid);
    const updatedDislikes = disliked
      ? product.dislikes.filter((uid) => uid !== user.uid)
      : [...product.dislikes, user.uid];

    update(prodRef, { dislikes: updatedDislikes });
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
    try {
      const product = products.find((p) => p.id === id);
      if (!product) return;

      // Delete all images from imgbb
      if (product.images && product.images.length) {
        for (const img of product.images) {
          if (img.deleteUrl) {
            await fetch(img.deleteUrl, { method: "GET" });
          }
        }
      }

      await remove(ref(db, `products/${id}`));
    } catch (error) {
      alert("Failed to delete product images: " + error.message);
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
          <span
            key={i}
            className={styles.letter}
            style={{ animationDelay: `${i * 0.05}s` }}
          >
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

      <form
        className={styles.postForm}
        onSubmit={(e) => {
          e.preventDefault();
          if (!uploading) handlePost();
        }}
      >
        <input
          className={styles.input}
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <input
          className={styles.input}
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
        <input
          className={styles.input}
          placeholder="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />
        <select
          className={styles.select}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
        >
          <option value="">Category</option>
          <option value="Electronics">📱 Electronics</option>
          <option value="Clothing">👗 Clothing</option>
          <option value="Food">🍲 Food</option>
          <option value="Vehicles">🚗 Vehicles</option>
          <option value="Other">🔧 Other</option>
        </select>

        <input
          className={styles.fileInput}
          type="file"
          multiple
          accept="image/*"
          onChange={handleImageChange}
          required
        />
        <button
          className={styles.postButton}
          type="submit"
          disabled={uploading}
          title="You can upload up to 3 images"
        >
          {uploading ? "Uploading..." : "📤 Post"}
        </button>
      </form>

      <div className={styles.productGrid}>
        {filtered.map((p) => (
          <div key={p.id} className={styles.card}>
            <div
              className={styles.deleteProduct}
              onClick={() => handleDeleteProduct(p.id)}
              title="Delete product"
            >
              ❌
            </div>

            {/* Show all images with click to open modal */}
            {p.images && p.images.length > 0 && (
              <div className={styles.imageGallery}>
                {p.images.map((img, idx) => (
                  <img
                    key={idx}
                    src={img.url}
                    alt={`${p.title} ${idx + 1}`}
                    className={styles.productImage}
                    onClick={() => setModal(p)}
                  />
                ))}
              </div>
            )}

            <h3 className={styles.productTitle}>{p.title}</h3>
            <p className={styles.productDescription}>{p.description}</p>
            <strong className={styles.productPrice}>{p.price}</strong>
            <div className={styles.productCategory}>📂 {p.category}</div>
            <div className={styles.productTime}>{p.time}</div>

            <div className={styles.socialRow}>
              <div>
                <span
                  onClick={() => handleLike(p.id)}
                  className={styles.emojiBtn}
                  title="Like"
                >
                  👍 {p.likes.length}
                </span>
                <span
                  onClick={() => handleDislike(p.id)}
                  className={styles.emojiBtn}
                  title="Dislike"
                >
                  👎 {p.dislikes.length}
                </span>
              </div>
              <a
                href={`https://wa.me/?text=Hi I'm interested in your ${encodeURIComponent(
                  p.title
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.waBtn}
                title="Contact via WhatsApp"
              >
                💬 WhatsApp
              </a>
            </div>

            <div className={styles.commentSection}>
              <button
                className={styles.commentToggle}
                onClick={() =>
                  setShowComments({ ...showComments, [p.id]: !showComments[p.id] })
                }
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
                className={styles.commentInput}
                placeholder="Add a comment..."
                value={commentInputs[p.id] || ""}
                onChange={(e) =>
                  setCommentInputs({ ...commentInputs, [p.id]: e.target.value })
                }
              />
              <button
                className={styles.postCommentBtn}
                onClick={() => handleComment(p.id)}
              >
                Post
              </button>
            </div>

            <button
              className={styles.chatSellerBtn}
              onClick={() => {
                setSelectedUser({ uid: p.ownerUID, name: p.ownerName });
                setShowModal(true);
              }}
            >
              Chat Seller
            </button>
          </div>
        ))}
      </div>

      {modal && (
        <div className={styles.modalOverlay} onClick={() => setModal(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            {modal.images &&
              modal.images.map((img, idx) => (
                <img
                  key={idx}
                  src={img.url}
                  alt={`${modal.title} full view ${idx + 1}`}
                  className={styles.modalImage}
                />
              ))}
            <h2>{modal.title}</h2>
            <p>{modal.description}</p>
            <p>📂 {modal.category}</p>
            <p className={styles.productPrice}>{modal.price}</p>
            <p style={{ fontSize: "12px", color: "#aaa" }}>{modal.time}</p>
            <a
              href={`https://wa.me/?text=Hi I'm interested in your ${encodeURIComponent(
                modal.title
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.waBtn}
            >
              💬 WhatsApp
            </a>
          </div>
        </div>
      )}

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
