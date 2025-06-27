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

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      const phoneRef = ref(db, `users/${user.uid}/whatsapp`);
      get(phoneRef).then((snap) => {
        if (!snap.exists()) {
          const phone = prompt("Enter your WhatsApp number (e.g. 26377...)");
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
    if (!user || !userWhatsApp) return alert("Login and set WhatsApp number.");
    if (!title || !description || !price || !category || !image)
      return alert("Fill all fields.");

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", image);
      const res = await fetch(
        `https://api.imgbb.com/1/upload?key=${imgbbKey}`,
        { method: "POST", body: formData }
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

  const handleComment = async (productId) => {
    const user = auth.currentUser;
    const text = commentInputs[productId];
    if (!user || !text) return;

    try {
      const userSnap = await get(ref(db, `users/${user.uid}`));
      const name = userSnap.exists() ? userSnap.val().name : "User";

      const comment = {
        name,
        text,
        uid: user.uid,
        timestamp: Date.now(),
      };

      await push(ref(db, `products/${productId}/comments`), comment);
      setCommentInputs({ ...commentInputs, [productId]: "" });
    } catch (err) {
      alert("Comment failed: " + err.message);
    }
  };

  const deleteProduct = (id) => {
    if (window.confirm("Delete this product?")) {
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
    if (!number) return "#";
    const message = encodeURIComponent(`Hi, I'm interested in "${title}"`);
    return `https://wa.me/${number}?text=${message}`;
  };

  const filtered = products.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      style={{
        ...styles.page,
        backgroundImage: "url('/assets/IMG-20250620-WA0006.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div style={{ textAlign: "center", fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>
        {"AFRIBASE MARKETPLACE".split("").map((char, i) => (
          <span
            key={i}
            style={{
              transition: "all 0.3s ease",
              color: `hsl(${i * 12}, 100%, 50%)`,
              marginRight: 2,
            }}
          >
            {char}
          </span>
        ))}
      </div>

      <input
        style={styles.search}
        placeholder="🔍 Search products..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Upload form and product grid remain unchanged */}
      {/* ... keep rest of your code here ... */}

      {modal && (
        <div style={styles.overlay} onClick={() => setModal(null)}>
          <img
            src={modal.image}
            style={{ maxWidth: "90%", maxHeight: "90%", borderRadius: 10 }}
            alt="Zoomed"
          />
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

const styles = {
  page: {
    padding: 20,
    minHeight: "100vh",
    fontFamily: "Poppins",
    color: "#000",
  },
  search: {
    width: "100%",
    padding: 10,
    fontSize: 16,
    marginBottom: 10,
  },
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
};
