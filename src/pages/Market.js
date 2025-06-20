import React, { useState, useEffect } from "react";
import { db, storage } from "../firebase";
import { ref, push, onValue } from "firebase/database";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

export default function Marketplace() {
  const [products, setProducts] = useState([]);
  const [likes, setLikes] = useState({});
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState("");
  const [modalItem, setModalItem] = useState(null);
  const [imgZoom, setImgZoom] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    const productRef = ref(db, "products");
    onValue(productRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setProducts(Object.values(data).reverse());
      }
    });
  }, []);

  const toggleLike = (id) => {
    setLikes((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const addComment = (id) => {
    if (!newComment.trim()) return;
    setComments((prev) => ({
      ...prev,
      [id]: [...(prev[id] || []), newComment.trim()]
    }));
    setNewComment("");
  };

  const contactLink = (title) =>
    `https://wa.me/?text=Hi! I saw your product "${title}" on Afribase, I'm interested!`;

  const openModal = (item) => {
    setModalItem(item);
    setImgZoom(false);
  };

  const isDark = darkMode;

  return (
    <div style={{ ...pageStyle, background: isDark ? "#121212" : "#f4f4f4", color: isDark ? "#fff" : "#000" }}>
      <button style={toggleIcon(isDark)} onClick={() => setDarkMode(!darkMode)}>
        {isDark ? "☀️" : "🌙"}
      </button>

      {/* Header */}
      <h2 style={headerStyle}>
        {"AFRIBASE MARKETPLACE".split("").map((char,i)=><span key={i} style={{...letterStyle, animationDelay:`${i*0.1}s`}}>{char}</span>)}
      </h2>

      {/* Product Grid */}
      <div style={productGrid}>
        {products.map((p, i) => (
          <div key={i} style={card(isDark)} onClick={() => openModal(p)}>
            <img src={p.image} alt="product" style={imgStyle} />
            <h3>{p.title}</h3>
            <strong style={{color:"#00ffcc"}}>{p.price}</strong>
            <div style={footerCard}>
              <button onClick={(e)=>{e.stopPropagation(); toggleLike(i)}} style={actionBtn}>👍 {likes[i] || 0}</button>
              <button onClick={(e)=>{e.stopPropagation(); openModal(p)}} style={actionBtn}>💬 {comments[i]?.length || 0}</button>
              <a href={contactLink(p.title)} onClick={(e)=>e.stopPropagation()} target="_blank" rel="noreferrer" style={actionBtn}>📞 WhatsApp</a>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modalItem && (
        <div style={modalOverlay} onClick={()=>setModalItem(null)}>
          <div style={modalContent} onClick={e=>e.stopPropagation()}>
            <img
              src={modalItem.image}
              alt="modal"
              style={imgZoom ? modalImageZoom : modalImage}
              onClick={() => setImgZoom(!imgZoom)}
            />
            <h2>{modalItem.title}</h2>
            <p>{modalItem.description}</p>
            <strong style={{color:"#00ffcc"}}>{modalItem.price}</strong>
            <p>📂 {modalItem.category}</p>
            <p style={{fontSize:"12px",color:"#aaa"}}>{modalItem.time}</p>

            <div style={modalFooter}>
              <button onClick={()=>toggleLike(modalItem.time)} style={actionBtn}>👍 {likes[modalItem.time]||0}</button>
              <input
                placeholder="Add comment..."
                value={newComment}
                onChange={(e)=>setNewComment(e.target.value)}
                style={commentInput(isDark)}
              />
              <button onClick={()=>addComment(modalItem.time)} style={actionBtn}>➕ Comment</button>
            </div>

            <div style={commentsList}>
              {(comments[modalItem.time] || []).map((c,i)=> (
                <div key={i} style={commentStyle(isDark)}>• {c}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Styles ---
const pageStyle = { padding:"20px", minHeight:"100vh", fontFamily:"Poppins", position:"relative" };
const toggleIcon = (d)=>({position:"absolute", top:20, right:20, fontSize:"20px", cursor:"pointer", backgroundColor:d?"#00ffcc":"#121212", color:d?"#000":"#fff", padding:"10px", borderRadius:"50%", border:"none", boxShadow:"0 0 10px #00ffcc99", zIndex:2});
const headerStyle = {textAlign:"center",marginBottom:"20px",fontSize:"32px",fontWeight:"900",letterSpacing:"2px",display:"flex",justifyContent:"center",flexWrap:"wrap"};
const letterStyle={display:"inline-block",background:"linear-gradient(to top,#00ffcc,#000)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",animation:"flickerColor 2s infinite"};
const productGrid={display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:"15px"};
const card = d=>({background:d?"#1e1e1e":"#fff",color:d?"#fff":"#000",padding:"10px",borderRadius:"10px",boxShadow:"0 0 8px #00ffcc30",cursor:"pointer",display:"flex",flexDirection:"column",justifyContent:"space-between"});
const imgStyle={width:"100%",height:"120px",objectFit:"cover",borderRadius:"8px"};
const footerCard={display:"flex",justifyContent:"space-between",marginTop:"10px"};
const actionBtn={padding:"6px 8px",background:"#00ffcc",border:"none",borderRadius:"6px",cursor:"pointer",fontSize:"14px"};
const modalOverlay={position:"fixed",top:0,left:0,right:0,bottom:0,backgroundColor:"rgba(0,0,0,0.7)",display:"flex",justifyContent:"center",alignItems:"center",zIndex:10};
const modalContent={background:"#1e1e1e",color:"#fff",padding:"20px",borderRadius:"10px",maxWidth:"90%",maxHeight:"90%",overflowY:"auto"};
const modalImage={width:"100%",maxHeight:"300px",objectFit:"contain",borderRadius:"8px"};
const modalImageZoom={width:"100%",height:"auto",objectFit:"contain",transform:"scale(1.2)",transition:"transform 0.3s"};
const modalFooter={marginTop:"15px",display:"flex",gap:"10px",alignItems:"center"};
const commentInput = d=>({flex:1,padding:"8px",borderRadius:"6px",border:"none",fontSize:"14px",background:d?"#333":"#eee",color:d?"#fff":"#000"});
const commentsList={maxHeight:"150px",overflowY:"auto",marginTop:"10px",textAlign:"left"};
const commentStyle = d=>({padding:"4px 0",borderBottom:`1px solid ${d?"#444":"#ccc"}`});
