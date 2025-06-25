// Marketplace.js import React, { useState, useEffect } from "react"; import { db } from "../firebase"; import { ref, push, onValue } from "firebase/database"; import { getAuth } from "firebase/auth"; import SendPrivateMessage from "../components/SendPrivateMessage";

const imgbbKey = "30df4aa05f1af3b3b58ee8a74639e5cf";

export default function Marketplace() { const [products, setProducts] = useState([]); const [title, setTitle] = useState(""); const [description, setDescription] = useState(""); const [price, setPrice] = useState(""); const [category, setCategory] = useState(""); const [image, setImage] = useState(null); const [search, setSearch] = useState(""); const [modal, setModal] = useState(null); const [commentInputs, setCommentInputs] = useState({}); const [showComments, setShowComments] = useState({}); const [showModal, setShowModal] = useState(false); const [selectedUser, setSelectedUser] = useState(null); const [uploading, setUploading] = useState(false); const [hiddenProducts, setHiddenProducts] = useState([]); const auth = getAuth();

useEffect(() => { const productRef = ref(db, "products"); onValue(productRef, (snapshot) => { const data = snapshot.val(); if (data) { const items = Object.entries(data).map(([id, val]) => ({ id, ...val, likes: val.likes || [], dislikes: val.dislikes || [], comments: val.comments ? Object.entries(val.comments).map(([cid, c]) => ({ id: cid, ...c })) : [], })); setProducts(items.reverse()); } }); }, []);

const handlePost = async () => { if (!title || !description || !price || !category || !image) { return alert("Fill all fields"); }
const user = auth.currentUser;   if (!user) return alert("Please login to post products.");   setUploading(true);    try {     const formData = new FormData();     formData.append("image", image);     const res = await fetch(https://api.imgbb.com/1/upload?key=${imgbbKey}, {       method: "POST",       body: formData,     });     const data = await res.json();     const url = data.data.url;      await push(ref(db, "products"), {       title,       description,       price,       category,       image: url,       time: new Date().toLocaleString(),       likes: [],       dislikes: [],       comments: [],       ownerUID: user.uid,       ownerName: user.displayName || "Unknown",     });      setTitle("");     setDescription("");     setPrice("");     setCategory("");     setImage(null);   } catch (err) {     alert("Image upload failed: " + err.message);   } finally {     setUploading(false);   }   
};

const handleComment = (id) => { const text = commentInputs[id]; const user = auth.currentUser; if (!text || !user) return;
const comment = {     name: user.displayName || "User",     text,     uid: user.uid,     timestamp: Date.now(),   };    push(ref(db, products/${id}/comments), comment);   setCommentInputs({ ...commentInputs, [id]: "" });   
};

const deleteFromView = (id) => { setHiddenProducts((prev) => [...prev, id]); };

const deleteCommentFromView = (productId, commentId) => { setProducts((prev) => prev.map((p) => p.id === productId ? { ...p, comments: p.comments.filter((c) => c.id !== commentId) } : p ) ); };

const toggleShowComments = (id) => { setShowComments({ ...showComments, [id]: !showComments[id] }); };

const filtered = products.filter( (p) => !hiddenProducts.includes(p.id) && (p.title.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase())) );

return ( <div style={{ ...pageStyle, backgroundImage: 'url("/assets/IMG-20250620-WA0005.jpg")', backgroundSize: "cover", }} > <input style={searchInput} placeholder="🔍 Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
 <div>       <input         placeholder="Title"         value={title}         onChange={(e) => setTitle(e.target.value)}       />       <input         placeholder="Description"         value={description}         onChange={(e) => setDescription(e.target.value)}       />       <input         placeholder="Price"         value={price}         onChange={(e) => setPrice(e.target.value)}       />       <select value={category} onChange={(e) => setCategory(e.target.value)}>         <option value="">Category</option>         <option value="Electronics">📱 Electronics</option>         <option value="Clothing">👗 Clothing</option>         <option value="Food">🍲 Food</option>         <option value="Vehicles">🚗 Vehicles</option>         <option value="Other">🔧 Other</option>       </select>       <input type="file" onChange={(e) => setImage(e.target.files[0])} />       <button onClick={handlePost} disabled={uploading}>         {uploading ? "Uploading..." : "📤 Post"}       </button>     </div>      <div style={productGrid}>       {filtered.map((p) => (         <div key={p.id} style={cardStyle}>           {auth.currentUser?.uid === p.ownerUID && (             <button               onClick={() => deleteFromView(p.id)}               style={closeBtnStyle}             >               ❌             </button>           )}            <img             src={p.image}             style={imgStyle}             alt={p.title}             onClick={() => setModal(p)}           />           <h3>{p.title}</h3>           <p>{p.description}</p>           <strong style={{ color: "#00cc99" }}>{p.price}</strong>           <div>📂 {p.category}</div>           <div style={{ fontSize: "12px", color: "#333" }}>{p.time}</div>            <div>             <button onClick={() => toggleShowComments(p.id)}>               💬 Comments ({p.comments.length})             </button>             {showComments[p.id] && (               <div                 style={{                   maxHeight: "100px",                   overflowY: "auto",                   marginTop: "5px",                 }}               >                 {p.comments.map((c) => (                   <p key={c.id}>                     <strong>{c.name}</strong>: {c.text}                     {auth.currentUser?.uid === c.uid && (                       <span                         style={{                           color: "red",                           marginLeft: 5,                           cursor: "pointer",                         }}                         onClick={() =>                           deleteCommentFromView(p.id, c.id)                         }                       >                         ❌                       </span>                     )}                   </p>                 ))}               </div>             )}             <input               style={commentStyle}               placeholder="Add a comment..."               value={commentInputs[p.id] || ""}               onChange={(e) =>                 setCommentInputs({                   ...commentInputs,                   [p.id]: e.target.value,                 })               }             />             <button style={buttonStyle} onClick={() => handleComment(p.id)}>               Post             </button>           </div>            <button             onClick={() => {               setSelectedUser({ uid: p.ownerUID, name: p.ownerName });               setShowModal(true);             }}             style={buttonStyle}           >             Chat Seller           </button>         </div>       ))}     </div>      {modal && (       <div style={modalOverlay} onClick={() => setModal(null)}>         <div style={modalContent} onClick={(e) => e.stopPropagation()}>           <img             src={modal.image}             style={modalImage}             alt={modal.title}           />           <h2>{modal.title}</h2>           <p>{modal.description}</p>           <p>📂 {modal.category}</p>           <p style={{ color: "#00cc99", fontWeight: "bold" }}>{modal.price}</p>           <p style={{ fontSize: "12px", color: "#aaa" }}>{modal.time}</p>         </div>       </div>     )}      {showModal && selectedUser && (       <SendPrivateMessage         recipientUID={selectedUser.uid}         recipientName={selectedUser.name}         onClose={() => setShowModal(false)}         productId={null}       />     )}   </div>  
); }

// Styles const pageStyle = { padding: 20, minHeight: "100vh", fontFamily: "Poppins", position: "relative", };

const searchInput = { width: "100%", padding: 10, fontSize: 16, borderRadius: 10, margin: "10px 0", border: "1px solid #ccc", };

const productGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 20, marginTop: 20, };

const cardStyle = { background: "#fff", padding: 15, borderRadius: 15, boxShadow: "0 2px 8px rgba(0,0,0,0.2)", position: "relative", };

const imgStyle = { width: "100%", height: "200px", objectFit: "cover", borderRadius: "10px", cursor: "pointer", };

const commentStyle = { width: "100%", padding: 8, borderRadius: 8, border: "1px solid #ccc", marginTop: 5, background: "#fff", color: "#000", };

const buttonStyle = { background: "#00cc88", color: "#fff", padding: "6px 12px", borderRadius: 6, border: "none", cursor: "pointer", marginTop: 5, };

const modalOverlay = { position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", };

const modalContent = { background: "#fff", padding: 20, borderRadius: 10, width: "90%", maxWidth: 400, textAlign: "center", };

const modalImage = { width: "100%", height: "250px", objectFit: "cover", borderRadius: 10, };

const closeBtnStyle = { position: "absolute", top: 8, right: 10, cursor: "pointer", background: "#ff4444", color: "white", border: "none", borderRadius: "50%", padding: "5px 10px", fontWeight: "bold", };
