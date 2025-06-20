import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc
} from "firebase/firestore";

const imgbbKey = "30df4aa05f1af3b3b58ee8a74639e5cf";

const Profile = () => {
  const [user, setUser] = useState(null);
  const [profileData, setProfileData] = useState({
    name: "",
    image: "",
    email: "",
    vip: false,
    posts: 0,
    likes: 0,
    comments: 0,
  });
  const [uploading, setUploading] = useState(false);
  const [signInDetails, setSignInDetails] = useState({ email: "", password: "" });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setProfileData(userSnap.data());
        } else {
          const defaultProfile = {
            name: "New User",
            image: "",
            email: firebaseUser.email || "",
            vip: false,
            posts: 0,
            likes: 0,
            comments: 0,
          };
          await setDoc(userRef, defaultProfile);
          setProfileData(defaultProfile);
        }
      } else {
        setUser(null);
      }
    });

    return () => unsub();
  }, []);

  const handleSignIn = async () => {
    try {
      await signInWithEmailAndPassword(auth, signInDetails.email, signInDetails.password);
    } catch (err) {
      alert("Login failed. Check your credentials.");
    }
  };

  const handleSignOut = () => signOut(auth);

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

    await updateDoc(doc(db, "users", user.uid), { image: imageUrl });
    setProfileData((prev) => ({ ...prev, image: imageUrl }));
    setUploading(false);
  };

  const handleNameChange = async () => {
    const newName = prompt("Enter new name:");
    if (!newName || !user) return;

    await updateDoc(doc(db, "users", user.uid), { name: newName });
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
            value={signInDetails.email}
            onChange={(e) => setSignInDetails({ ...signInDetails, email: e.target.value })}
            style={input}
          />
          <input
            type="password"
            placeholder="Password"
            value={signInDetails.password}
            onChange={(e) => setSignInDetails({ ...signInDetails, password: e.target.value })}
            style={input}
          />
          <button style={button} onClick={handleSignIn}>Log In</button>
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
        {uploading && <p>Uploading image...</p>}

        <h2 style={name}>{profileData.name}</h2>
        <p style={tagline}>{profileData.email}</p>

        {profileData.vip && <div style={badge}>🌟 VIP MEMBER</div>}

        <div style={stats}>
          <div><strong>{profileData.posts}</strong><p>Posts</p></div>
          <div><strong>{profileData.likes}</strong><p>Likes</p></div>
          <div><strong>{profileData.comments}</strong><p>Comments</p></div>
        </div>

        <button style={button} onClick={handleNameChange}>Edit Name</button>
        <button style={{ ...button, background: "#f44336" }} onClick={handleSignOut}>Sign Out</button>
      </div>
    </div>
  );
};

export default Profile;

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
