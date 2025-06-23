import React, { useEffect, useState } from "react";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { ref, set, get, child, update } from "firebase/database";
import { db } from "../firebase";

const auth = getAuth();
const imgbbKey = "30df4aa05f1af3b3b58ee8a74639e5cf";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    image: "",
    vip: false,
    posts: 0,
    likes: 0,
    comments: 0,
  });
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const snapshot = await get(child(ref(db), `users/${u.uid}`));
        if (snapshot.exists()) {
          setProfileData(snapshot.val());
        } else {
          const defaultData = {
            name: "New User",
            email: u.email,
            image: "",
            vip: false,
            posts: 0,
            likes: 0,
            comments: 0,
          };
          await set(ref(db, `users/${u.uid}`), defaultData);
          setProfileData(defaultData);
        }
      } else {
        setUser(null);
      }
    });

    return () => unsub();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, loginForm.email, loginForm.password);
    } catch (err) {
      alert("Login failed: " + err.message);
    }
  };

  const handleLogout = () => signOut(auth);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("image", file);

    const res = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    const imageUrl = data.data.url;

    await update(ref(db, `users/${user.uid}`), { image: imageUrl });
    setProfileData((prev) => ({ ...prev, image: imageUrl }));
    setUploading(false);
  };

  const handleNameChange = async () => {
    const newName = prompt("Enter your name:");
    if (!newName || !user) return;
    await update(ref(db, `users/${user.uid}`), { name: newName });
    setProfileData((prev) => ({ ...prev, name: newName }));
  };

  if (!user) {
    return (
      <div style={container}>
        <div style={card}>
          <h2>Sign In</h2>
          <input
            type="email"
            placeholder="Email"
            value={loginForm.email}
            onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
            style={input}
          />
          <input
            type="password"
            placeholder="Password"
            value={loginForm.password}
            onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
            style={input}
          />
          <button style={button} onClick={handleLogin}>Log In</button>
        </div>
      </div>
    );
  }

  return (
    <div style={container}>
      <div style={card}>
        <div style={avatar}>
          {profileData.image ? (
            <img src={profileData.image} alt="Profile" style={{ width: "100%", height: "100%", borderRadius: "50%" }} />
          ) : (
            <p style={{ fontSize: 30, marginTop: 28 }}>👤</p>
          )}
        </div>

        <input type="file" accept="image/*" onChange={handleImageUpload} />
        {uploading && <p>Uploading...</p>}

        <h2 style={name}>{profileData.name}</h2>
        <p style={tagline}>{profileData.email}</p>

        {profileData.vip && <div style={badge}>🌟 VIP</div>}

        <div style={stats}>
          <div><strong>{profileData.posts}</strong><p>Posts</p></div>
          <div><strong>{profileData.likes}</strong><p>Likes</p></div>
          <div><strong>{profileData.comments}</strong><p>Comments</p></div>
        </div>

        <button style={button} onClick={handleNameChange}>Edit Name</button>
        <button style={{ ...button, background: "#f44336" }} onClick={handleLogout}>Sign Out</button>
      </div>
    </div>
  );
}

// Styles
const container = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "100vh",
  background: "#f5f5f5",
  padding: "20px"
};

const card = {
  background: "#fff",
  borderRadius: "20px",
  padding: "30px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  textAlign: "center",
  maxWidth: "350px",
  width: "100%"
};

const avatar = {
  width: "100px",
  height: "100px",
  borderRadius: "50%",
  background: "#ddd",
  margin: "0 auto 20px",
  overflow: "hidden"
};

const name = {
  fontSize: "24px",
  fontWeight: "700",
  margin: "10px 0 5px"
};

const tagline = {
  fontSize: "14px",
  color: "#777",
  marginBottom: "15px"
};

const badge = {
  background: "#ffc107",
  color: "#000",
  padding: "6px 14px",
  borderRadius: "30px",
  fontSize: "12px",
  fontWeight: "600",
  marginBottom: "20px",
  display: "inline-block"
};

const stats = {
  display: "flex",
  justifyContent: "space-around",
  marginBottom: "20px",
  fontSize: "14px",
  color: "#555"
};

const button = {
  background: "#00cc88",
  color: "#fff",
  padding: "10px 20px",
  border: "none",
  borderRadius: "10px",
  fontWeight: "600",
  cursor: "pointer",
  marginTop: "10px"
};

const input = {
  width: "90%",
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  marginBottom: "10px"
};
