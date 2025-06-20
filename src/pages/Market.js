import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { ref, push, onValue, update, remove } from "firebase/database";
import { deleteObject } from "firebase/storage";

const currentUserId = "demoUser123"; // Replace later with actual auth UID
const IMGBB_KEY = "30df4aa05f1af3b3b58ee8a74639e5cf";

export default function Marketplace() {
  const [products, setProducts] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [search, setSearch] = useState("");
  const [darkMode, setDarkMode] = useState(true);
  const [commentInputs, setCommentInputs] = useState({});
  const timerRef = useRef();

  // Load products
  useEffect(() => {
    const prodRef = ref(db, "products");
    return onValue(prodRef, snap => {
      const data = snap.val();
      if (!data) return setProducts([]);
      const arr = Object.entries(data).map(([id, v]) => ({
        id,
        ...v,
        comments: v.comments ? Object.entries(v.comments).map(([cid, c]) => ({ id: cid, ...c })) : []
      })).reverse();
      setProducts(arr);
    });
  }, []);

  // Long press to delete
  const handleLongPress = (p) => {
    if (p.userId !== currentUserId) return;
    if (!window.confirm(`Delete product "${p.title}"?`)) return;
    // delete image from imgbb by URL removing
    remove(ref(db, `products/${p.id}`));
  };
  const useLongPress = (cb, ms = 700) => ({
    onMouseDown: () => (timerRef.current = setTimeout(cb, ms)),
    onMouseUp: () => clearTimeout(timerRef.current),
    onMouseLeave: () => clearTimeout(timerRef.current),
    onTouchStart: () => (timerRef.current = setTimeout(cb, ms)),
    onTouchEnd: () => clearTimeout(timerRef.current),
  });

  const handlePost = async () => {
    if (!title || !description || !price || !category || !imageFile) return alert("Fill all fields");
    const form = new FormData();
    form.append("image", imageFile);
    try {
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { method: "POST", body: form });
      const { data: d } = await res.json();
      push(ref(db, "products"), {
        title, description, price, category, image: d.url,
        time: new Date().toLocaleString(),
        likes: [], dislikes: [], comments: [], userId: currentUserId
      });
      setTitle(""); setDescription(""); setPrice(""); setCategory(""); setImageFile(null);
    } catch {
      alert("Image upload failed");
    }
  };

  const toggleReaction = (p, type) => {
    const arr = p[type];
    const idx = arr.indexOf(currentUserId);
    const upd = idx === -1 ? [...arr, currentUserId] : arr.filter(u => u !== currentUserId);
    update(ref(db, `products/${p.id}`), { [type]: upd });
  };

  const handleComment = (pId) => {
    const text = commentInputs[pId]?.trim();
    if (!text) return;
    push(ref(db, `products/${pId}/comments`), {
      text, userId: currentUserId, timestamp: Date.now()
    });
    setCommentInputs({ ...commentInputs, [pId]: "" });
  };

  const filtered = products.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase())
  );

  const lpEvents = useLongPress(() => handleLongPress(lpProduct.current));
  const lpProduct = useRef();

  return (
    <div style={{ padding:20, background: darkMode? "#121212":"#f4f4f4", minHeight:"100vh", fontFamily:"Poppins", color: darkMode? "#fff":"#000" }}>
      <button onClick={() => setDarkMode(!darkMode)} style={{ float:"right", padding:10,borderRadius:20, background: darkMode?"#00ffcc":"#121212", color:darkMode?"#000":"#fff",border:"none" }}>
        {darkMode ? "🌙" : "☀️"}
      </button>
      <h2 style={{ textAlign:"center", fontWeight:"bold", background:"linear-gradient(to right, green, black)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", marginBottom:20 }}>
        {"AFRIBASE MARKETPLACE".split("").map((c,i) => (
          <span key={i} style={{ animation: "fade 1s ease-in-out", animationDelay:`${i*0.05}s`, display:"inline-block" }}>{c}</span>
        ))}
      </h2>

      <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
        style={{ padding:10,width:"100%", maxWidth:400, margin:"0 auto 20px", display:"block", borderRadius:8,border:"1px solid #ccc" }} />

      <div style={{ maxWidth:500, margin:"auto", display:"flex", flexWrap:"wrap", gap:10 }}>
        {["Title","Description","Price","Category","Image","Post"].map((_,i) => (
          <div key={i} style={{ flex:"1 1 45%" }}>{/* Replace with actual fields */}</div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px, 1fr))", gap:16, marginTop:30 }}>
        {filtered.map(p => (
          <div key={p.id} ref={lpProduct} {...lpEvents}
            style={{ background:darkMode?"#1e1e1e":"#fff", padding:12, borderRadius:10, boxShadow:"0 0 6px rgba(0,0,0,0.1)" }}>
            <img src={p.image} alt="" style={{ width:"100%", height:100, objectFit:"contain", borderRadius:6, marginBottom:8, cursor:"pointer" }} />
            <h4 style={{ margin:"0 0 4px" }}>{p.title}</h4>
            <p style={{ margin:"0 0 4px", fontSize:12 }}>{p.price}</p>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:14 }}>
              <button onClick={() => toggleReaction(p,"likes")}>
                👍 {p.likes.length}
              </button>
              <button onClick={() => toggleReaction(p,"dislikes")}>
                👎 {p.dislikes.length}
              </button>
            </div>
            <div style={{ marginTop:8 }}>
              {p.comments.map(c => (
                <div key={c.id} style={{ fontSize:12, display:"flex", justifyContent:"space-between" }}>
                  <span>{c.text}</span>
                  {c.userId === currentUserId && <button onClick={() => {
                    if (window.confirm("Delete comment?")) remove(ref(db, `products/${p.id}/comments/${c.id}`));
                  }}>✖</button>}
                </div>
              ))}
              <input value={commentInputs[p.id]||""} onChange={e => setCommentInputs({...commentInputs, [p.id]: e.target.value})} placeholder="Add comment" style={{ width:"100%", marginTop:4 }} />
              <button onClick={() => handleComment(p.id)} style={{ width:"100%", marginTop:4 }}>Post</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
