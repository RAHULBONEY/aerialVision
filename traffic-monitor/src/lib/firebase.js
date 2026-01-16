
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth"; 
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD6DwY2khvOQmAtinpjQLsWxwrioFoevEw",
  authDomain: "aerialvision-3b3e8.firebaseapp.com",
  projectId: "aerialvision-3b3e8",
  storageBucket: "aerialvision-3b3e8.firebasestorage.app",
  messagingSenderId: "276725595696",
  appId: "1:276725595696:web:3a7b93264b4d9b28bcf7f5",
  measurementId: "G-YW1WMQWXE3"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app); 
