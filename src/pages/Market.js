import React, { useState, useEffect } from "react";
import styles from "./Marketplace.module.css";  // import CSS module

// inside your component JSX:
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

    <form className={styles.postForm} onSubmit={(e) => { e.preventDefault(); handlePost(); }}>
      <input
        className={styles.input}
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        className={styles.input}
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <input
        className={styles.input}
        placeholder="Price"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
      />
      <select
        className={styles.select}
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      >
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
        className={styles.fileInput}
        onChange={(e) => setImages(Array.from(e.target.files))}
      />
      <button
        type="submit"
        className={styles.postButton}
        disabled={uploading}
      >
        {uploading ? "Uploading..." : "📤 Post"}
      </button>
    </form>

    <div className={styles.productGrid}>
      {filtered.map((p) => (
        <div key={p.id} className={styles.card}>
          {auth.currentUser?.uid === p.ownerUID && (
            <div
              className={styles.deleteProduct}
              onClick={() => handleDeleteProduct(p.id)}
            >
              ❌
            </div>
          )}

          {(p.images || []).map((img, i) => (
            <img key={i} src={img.url} alt="" className={styles.productImage} />
          ))}

          <h3 className={styles.productTitle}>{p.title}</h3>
          <p className={styles.productDescription}>{p.description}</p>
          <strong className={styles.productPrice}>{p.price}</strong>
          <div className={styles.productCategory}>📂 {p.category}</div>
          <div className={styles.productTime}>{p.time}</div>

          <div className={styles.socialRow}>
            <span
              className={`${styles.emojiBtn} ${
                p.likes.includes(auth.currentUser?.uid) ? styles.emojiBtnActive : ""
              }`}
              onClick={() => handleLike(p.id)}
            >
              👍 {p.likes.length}
            </span>
            <span
              className={`${styles.emojiBtn} ${
                p.dislikes.includes(auth.currentUser?.uid) ? styles.emojiBtnActive : ""
              }`}
              onClick={() => handleDislike(p.id)}
            >
              👎 {p.dislikes.length}
            </span>
            <a
              href={`https://wa.me/?text=Hi I'm interested in your ${encodeURIComponent(
                p.title
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.waBtn}
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
                      className={styles.deleteComment}
                      onClick={() => handleDeleteComment(p.id, key)}
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
              onChange={(e) => setCommentInputs({ ...commentInputs, [p.id]: e.target.value })}
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
