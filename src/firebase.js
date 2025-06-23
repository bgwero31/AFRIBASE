// src/firebase.js
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
// Optional: import analytics only if you use it
// import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDW5ntQiR9cF-qZ9vOGY49P6hTOUhTPxdc",
  authDomain: "neurobet-ai.firebaseapp.com",
  databaseURL: "https://neurobet-ai-default-rtdb.firebaseio.com",
  projectId: "neurobet-ai",
  storageBucket: "neurobet-ai.appspot.com", // <-- keep this one
  messagingSenderId: "793175611155",
  appId: "1:793175611155:web:10d91cb8d4fca30f6eece6",
  measurementId: "G-RPZZ9MPQTJ"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const storage = getStorage(app);

// If you want to use analytics, uncomment below:
// export const analytics = getAnalytics(app);
