[6/20, 18:13] B.JAY: import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref, push, onValue, update } from "firebase/database";

const IMGBB_API_KEY = "30df4aa05f1af3b3b58ee8a74639e5cf";

export default function Marketplace() {
  const [products, setProducts] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [image, setImage] = useState(null);
  const [search, setSearch] = useState("");
  const [darkMode, setDarkMode] = useState(true);
  const [modal, setModal] = useState(null);
  const [commentInputs, setCommentInputs] = useState({});

  useEffect(() => {
    const productRef = ref(db, "products");
    onValue(productRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const items = Object.entries(data).map(([id, val]) => ({
          id,
          ...val,
          likes: val.likes || 0,
          dislikes: val.dislikes || 0,
          comments: val.comments ? Object.values(val.comments) : []
        }));
        setProducts(items.reverse());
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
        title, description, price, category, image: imageUrl,
        time: new Date().toLocaleString(),
        likes: 0, dislikes: 0
      });
      setTitle(""); setDescription(""); setPrice(""); setCategory(""); setImage(null);
      alert("âœ… Product posted!");
    } catch (error) {
      console.error(error);
      alert("Image upload or post failed. Try again.");
    }
  };

  const handleLike = (id, delta) => {
    const field = delta > 0 ? "likes" : "dislikes";
    const prodRef = ref(db, `products/${id}`);
    update(prodRef, { [field]: products.find(p => p.id === id)[field] + 1 });
  };

  const handleComment = (id) => {
    const text = commentInputs[id];
    if (!text) return;
    push(ref(db, `products/${id}/comments`), text);
    setCommentInputs({ ...commentInputs, [id]: "" });
  };

  const filtered = products.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase())
  );

  const isDark = darkMode;

  return (
    <div style={{ ...pageStyle, background: isDark ? "#121212" : "#f4f4f4", color: isDark ? "#fff" : "#000" }}>
      <button style={toggleBtnStyle(isDark)} onClick={() => setDarkMode(!darkMode)}>
        {isDark ? "â˜€ï¸" : "ðŸŒ™"}
      </button>

      <h2 style={headerStyle}>
        {"AFRIBASE MARKETPLACE".split(" ").map((w, i) =>
          <span key={i} style={{ marginRight: "10px" }}>
            {w.split("").map((c, j) => (
              <span key={j} style={{ ...letterStyle, animationDelay: `${(i+j)*0.05}s` }}>{c}</span>
            ))}
          </span>
        )}
      </h2>

      <input
        style={{ ...searchInput, background: isDark? "#1f1f1f":"#fff", color: isDark? "#fff":"#000" }}
        placeholder="ðŸ” Search products..." value={search} onChange={e => setSearch(e.target.value)}
      />

      <div style={formStyle}>
        <input style={inputStyle(isDark)} placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
        <textarea style={textStyle(isDark)} placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
        <input style={inputStyle(isDark)} placeholder="Price" value={price} onChange={e => setPrice(e.target.value)} />
        <select style={inputStyle(isDark)} value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">Category</option>
          <option value="Electronics">ðŸ“± Electronics</option>
          <option value="Clothing">ðŸ‘— Clothing</option>
          <option value="Food">ðŸ² Food</option>
          <option value="Vehicles">ðŸš— Vehicles</option>
          <option value="Other">ðŸ”§ Other</option>
        </select>
        <input type="file" onChange={e => setImage(e.target.files[0])} />
        <button style={buttonStyle} onClick={handlePost}>ðŸ“¤ Post</button>
      </div>

      <div style={productGrid}>
        {filtered.map(p => (
          <div key={p.id} style={{ ...cardStyle(isDark) }}>
            <img src={p.image} style={imgStyle} onClick={() => setModal(p)} />
            <h3>{p.title}</h3>
            <p style={{ flexGrow:1 }}>{p.description}</p>
            <strong style={{ color: "#00ffcc" }}>{p.price}</strong>
            <div style={categoryStyle}>ðŸ“‚ {p.category}</div>
            <div style={{ fontSize:"12px", color:isDark?"#aaa":"#555", marginBottom:"8px" }}>{p.time}</div>
            <div style={socialRowStyle}>
              <div>
                <span onClick={() => handleLike(p.id, 1)} style={emojiBtnStyle}>ðŸ‘ {p.likes}</span>
                <span onClick={() => handleLike(p.id, -1)} style={emojiBtnStyle}>ðŸ‘Ž {p.dislikes}</span>
              </div>
              <a href={`https://wa.me/?text=Hi I'm interested in your ${encodeURIComponent(p.title)}`} target="_blank" rel="noopener noreferrer" style={waBtnStyle}>ðŸ’¬ WhatsApp</a>
            </div>
            <input style={commentStyle(isDark)} placeholder="ðŸ’¬ Add comment..." value={commentInputs[p.id]||""} onChange={e => setCommentInputs({ ...commentInputs, [p.id]: e.target.value })} />
            <button style={buttonStyle} onClick={() => handleComment(p.id)}>Post</button>
          </div>
        ))}
      </div>

      {modal && (
        <div style={modalOverlay} onClick={()=>setModal(null)}>
          <div style={modalContent}>
            <img src={modal.image} style={modalImage} />
            <h2>{modal.title}</h2>
            <p>{modal.description}</p>
            <p>ðŸ“‚ {modal.category}</p>
            <p style={{ color:"#00ffcc", fontWeight:"bold" }}>{modal.price}</p>
            <p style={{ fontSize:"12px", color:"#aaa" }}>{modal.time}</p>
            <a href={`https://wa.me/?text=Hi I'm interested`} style={waBtnStyle}>ðŸ’¬ WhatsApp</a>
          </div>
        </div>
      )}
    </div>
  );
}

// Styles
const toggleBtnStyle = isDark => ({
  position: "absolute", top:20, right:20, fontSize:20,
  background:isDark?"#00ffcc":"#121212", color:isDark?"#000":"#fff",
  padding:10, borderRadius:50, border:"none", boxShadow:"0 0 10px #00ffcc99", zIndex:2
});
const pageStyle = { padding:20, minHeight:"100vh", fontFamily:"Poppins", position:"relative" };
const headerStyle = { textAlign:"center", margin:"20px 0", fontWeight:"800", display:"flex", justifyContent:"center", flexWrap:"wrap" };
const letterStyle = { background:"linear-gradient(to top,#00ffcc,#000)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", animation:"flickerColor 2s infinite" };
const searchInput = { width:"100%", maxWidth:400, display:"block", margin:"0 auto 20px", padding:"10px", border:"none", borderRadius:8, fontSize:16 };
const formStyle = { display:"flex", flexDirection:"column", gap:10, maxWidth:400, margin:"0 auto 20px" };
const inputStyle = isDark => ({ padding:12, borderRadius:8, border:"none", fontSize:16, background:isDark?"#1f1f1f":"#fff", color:isDark?"#fff":"#000" });
const textStyle = inputStyle;
const buttonStyle = { padding:10, backgroundColor:"#00ffcc", color:"#000", border:"none", borderRadius:6, fontSize:14, cursor:"pointer", marginTop:5 };
const productGrid = { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))", gap:16 };
const cardStyle = isDark => ({ padding:12, borderRadius:10, boxShadow:"0 0 10px #00ffcc30", display:"flex", flexDirection:"column", background:isDark?"#1e1e1e":"#fff", color:isDark?"#fff":"#000" });
const imgStyle = { width:"100%", height:140, objectFit:"cover", borderRadius:8, marginBottom:10, cursor:"pointer" };
const categoryStyle = { fontSize:14, color:"#00ffcc", margin:"5px 0" };
const socialRowStyle = { display:"flex", justifyContent:"space-between", alignItems:"center", background:"rgba(255,255,255,0.06)", padding:"8px", borderRadius:8, marginTop:10 };
const emojiBtnStyle = { cursor:"pointer", marginRight:10, fontSize:16 };
const waBtnStyle = { backgroundColor:"#25D366", color:"#fff", padding:"6px 12px", borderRadius:20, textDecoration:"none", fontSize:14, fontWeight:"500" };
const commentStyle = isDark => ({ ...inputStyle(isDark), marginTop:10 });
const modalOverlay = { position:"fixed", top:0,left:0,right:0,bottom:0, background:"rgba(0,0,0,0.7)", display:"flex", justifyContent:"center", alignItems:"center", zIndex:10 };
const modalContent = { background:"#1e1e1e", padding:20, borderRadius:10, maxWidth:"90%", maxHeight:"90%", color:"#fff", overflowY:"auto", textAlign:"center" };
const modalImage = { width:"100%", maxHeight:300, objectFit:"contain", borderRadius:8, marginBottom:20 };
[6/21, 18:40] B.JAY: import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { ref, push, onValue, update, remove } from "firebase/database";

const IMGBB_API_KEY = "30df4aa05f1af3b3b58ee8a74639e5cf";

export default function Marketplace() {
  const [products, setProducts] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [image, setImage] = useState(null);
  const [search, setSearch] = useState("");
  const [darkMode, setDarkMode] = useState(true);
  const [modal, setModal] = useState(null);
  const [commentInputs, setCommentInputs] = useState({});
  const [userLikes, setUserLikes] = useState({});

  // Ref for hidden file input
  const hiddenFileInput = useRef(null);

  useEffect(() => {
    const productRef = ref(db, "products");
    onValue(productRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const items = Object.entries(data).map(([id, val]) => ({
          id,
          ...val,
          likes: val.likes || 0,
          dislikes: val.dislikes || 0,
          comments: val.comments ? val.comments : {},
        }));
        setProducts(items.reverse());
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
    if (!title || !description || !price || !category || !image) return alert("Please fill all fields.");
    try {
      const base64Image = await toBase64(image);
      const formData = new FormData();
      formData.append("image", base64Image.split(",")[1]);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!data.success) throw new Error("Upload failed");
      const imageUrl = data.data.url;
      const imageDeleteUrl = data.data.delete_url;

      push(ref(db, "products"), {
        title,
        description,
        price,
        category,
        image: imageUrl,
        imageDeleteUrl,
        time: new Date().toLocaleString(),
        likes: 0,
        dislikes: 0,
      });

      setTitle("");
      setDescription("");
      setPrice("");
      setCategory("");
      setImage(null);
      alert("✅ Product posted!");
    } catch (error) {
      alert("Failed to upload");
    }
  };

  const handleLike = (id, type) => {
    const key = `${id}_${type}`;
    const product = products.find((p) => p.id === id);
    if (!product) return;

    const field = type === "like" ? "likes" : "dislikes";
    const prodRef = ref(db, `products/${id}`);
    const currentValue = product[field];

    const alreadyToggled = userLikes[key];
    const newValue = alreadyToggled ? currentValue - 1 : currentValue + 1;

    update(prodRef, { [field]: newValue });
    setUserLikes({ ...userLikes, [key]: !alreadyToggled });
  };

  const handleComment = (id) => {
    const text = commentInputs[id];
    if (!text) return;
    push(ref(db, `products/${id}/comments`), text);
    setCommentInputs({ ...commentInputs, [id]: "" });
  };

  const deleteComment = (productId, commentKey) => {
    remove(ref(db, `products/${productId}/comments/${commentKey}`));
  };

  const deleteProduct = async (id, deleteUrl) => {
    if (confirm("Delete this product permanently?")) {
      await fetch(deleteUrl); // delete image from imgbb
      await remove(ref(db, `products/${id}`)); // delete from firebase
    }
  };

  let longPressTimer;
  const startLongPress = (id, deleteUrl) => {
    longPressTimer = setTimeout(() => deleteProduct(id, deleteUrl), 1200);
  };
  const cancelLongPress = () => clearTimeout(longPressTimer);

  // Open hidden file input when image box clicked
  const onImageBoxClick = () => {
    if (hiddenFileInput.current) {
      hiddenFileInput.current.click();
    }
  };

  // Handle file selection from hidden input
  const onFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  // Handle Inbox button click — replace URL with your actual inbox/chat page
  const openInbox = () => {
    window.location.href = "/inbox"; // Or your chat inbox route
  };

  const isDark = darkMode;
  const filtered = products.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ ...pageStyle, background: isDark ? "#121212" : "#f4f4f4", color: isDark ? "#fff" : "#000" }}>
      <button style={toggleBtnStyle(isDark)} onClick={() => setDarkMode(!darkMode)}>
        {isDark ? "🌙" : "🌞"}
      </button>

      <button onClick={openInbox} style={inboxBtnStyle}>
        📥 Inbox
      </button>

      <h2 style={headerStyle}>
        {"AFRIBASE MARKETPLACE".split(" ").map((w, i) => (
          <span key={i} style={{ marginRight: 10 }}>
            {w.split("").map((c, j) => (
              <span key={j} style={letterStyle}>
                {c}
              </span>
            ))}
          </span>
        ))}
      </h2>

      <input
        style={{ ...searchInput, background: isDark ? "#1f1f1f" : "#fff", color: isDark ? "#fff" : "#000" }}
        placeholder="🔎 Search products..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div style={formStyle}>
        <input style={inputStyle(isDark)} placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea style={inputStyle(isDark)} placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <input style={inputStyle(isDark)} placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} />
        <select style={inputStyle(isDark)} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Category</option>
          <option>📱 Electronics</option>
          <option>👗 Clothing</option>
          <option>🍿 Food</option>
          <option>🚗 Vehicles</option>
          <option>🛠 Other</option>
        </select>

        {/* Hidden file input */}
        <input
          type="file"
          style={{ display: "none" }}
          ref={hiddenFileInput}
          onChange={onFileChange}
          accept="image/*"
        />

        {/* Image box that triggers file select */}
        <div
          onClick={onImageBoxClick}
          style={{
            ...imgStyle,
            backgroundColor: "#222",
            color: "#aaa",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            cursor: "pointer",
            marginBottom: 15,
            userSelect: "none",
            border: "2px dashed #00ffcc",
          }}
        >
          {image ? (
            <img
              src={URL.createObjectURL(image)}
              alt="Selected"
              style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }}
            />
          ) : (
            <span>Click here to select product image</span>
          )}
        </div>

        <button style={buttonStyle} onClick={handlePost}>
          📝 Post
        </button>
      </div>

      <div style={productGrid}>
        {filtered.map((p) => (
          <div
            key={p.id}
            style={cardStyle(isDark)}
            onTouchStart={() => startLongPress(p.id, p.imageDeleteUrl)}
            onTouchEnd={cancelLongPress}
          >
            <img src={p.image} style={imgStyle} onClick={() => setModal(p)} alt={p.title} />
            <h3>{p.title}</h3>
            <p>{p.description}</p>
            <strong style={{ color: "#00ffcc" }}>{p.price}</strong>
            <div style={categoryStyle}>📂 {p.category}</div>
            <div style={{ fontSize: 12, color: "#aaa", margin: "5px 0" }}>{p.time}</div>
            <div>
              <span onClick={() => handleLike(p.id, "like")} style={emojiBtnStyle}>
                👍 {p.likes}
              </span>
              <span onClick={() => handleLike(p.id, "dislike")} style={emojiBtnStyle}>
                👎 {p.dislikes}
              </span>
            </div>
            <a
              href={`https://wa.me/?text=Hi I'm interested in your ${encodeURIComponent(p.title)}`}
              target="_blank"
              rel="noreferrer"
              style={waBtnStyle}
            >
              💬 WhatsApp
            </a>
            {Object.entries(p.comments).map(([key, text]) => (
              <div key={key} style={{ marginTop: 5, fontSize: 14 }}>
                {text}{" "}
                <span onClick={() => deleteComment(p.id, key)} style={{ color: "red", cursor: "pointer" }}>
                  ✖
                </span>
              </div>
            ))}
            <input
              style={commentStyle(isDark)}
              value={commentInputs[p.id] || ""}
              onChange={(e) => setCommentInputs({ ...commentInputs, [p.id]: e.target.value })}
              placeholder="💬 Comment..."
            />
            <button style={buttonStyle} onClick={() => handleComment(p.id)}>
              Post
            </button>
          </div>
        ))}
      </div>

      {modal && (
        <div style={modalOverlay} onClick={() => setModal(null)}>
          <div style={modalContent}>
            <img src={modal.image} style={modalImage} alt={modal.title} />
            <h2>{modal.title}</h2>
            <p>{modal.description}</p>
            <p>📂 {modal.category}</p>
            <p style={{ color: "#00ffcc", fontWeight: "bold" }}>{modal.price}</p>
            <p style={{ fontSize: 12, color: "#aaa" }}>{modal.time}</p>
            <a href={`https://wa.me/?text=Hi I'm interested`} style={waBtnStyle}>
              💬 WhatsApp
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// Styles
const toggleBtnStyle = (isDark) => ({
  position: "absolute",
  top: 20,
  right: 20,
  fontSize: 20,
  background: isDark ? "#00ffcc" : "#121212",
  color: isDark ? "#000" : "#fff",
  padding: 10,
  borderRadius: 50,
  border: "none",
  boxShadow: "0 0 10px #00ffcc99",
  zIndex: 2,
});

const inboxBtnStyle = {
  position: "absolute",
  top: 20,
  left: 20,
  fontSize: 18,
  backgroundColor: "#00a851",
  color: "#fff",
  padding: "8px 15px",
  borderRadius: 20,
  border: "none",
  cursor: "pointer",
  boxShadow: "0 0 10px #00a85199",
