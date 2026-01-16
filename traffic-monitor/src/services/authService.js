// src/services/authService.js
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase"; // Ensure this points to your firebase config

export const AuthService = {
  /**
   * Logs the user in, verifies role in Firestore, and sets LocalStorage.
   */
  login: async ({ email, password }) => {
    try {
      // 1. Authenticate with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const { uid } = userCredential.user;

      // 2. Fetch User Profile from Firestore (The Authorization Step)
      const userDocRef = doc(db, "users", uid);
      const userDoc = await getDoc(userDocRef);

      // 3. Guard Clause: If user has no database record, deny access
      if (!userDoc.exists()) {
        await signOut(auth); // Force logout
        throw new Error("ACCESS_DENIED: No operator profile found.");
      }

      const userData = userDoc.data();

      // 4. (Optional) Check active status
      if (userData.status === 'SUSPENDED') {
        await signOut(auth);
        throw new Error("ACCESS_REVOKED: Operator account suspended.");
      }

      // 5. Prepare Session Data
      const sessionData = {
        uid: uid,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        token: await userCredential.user.getIdToken(), // JWT Token for future backend calls
      };

      // 6. Save to Local Storage (Persist Session)
      localStorage.setItem("aerial_vision_user", JSON.stringify(sessionData));

      return sessionData;
    } catch (error) {
      // Clean up local storage if anything fails
      localStorage.removeItem("aerial_vision_user");
      throw error;
    }
  },

  /**
   * Logs out and clears local storage
   */
  logout: async () => {
    await signOut(auth);
    localStorage.removeItem("aerial_vision_user");
  },

  /**
   * DEV ONLY: Helper to seed the first user since your DB is empty
   */
  seedAdmin: async (email, password) => {
    try {
      // This will fail if the user already exists in Auth, which is fine
      const userCredential = await signInWithEmailAndPassword(auth, email, password); 
      const { uid } = userCredential.user;
      
      const userRef = doc(db, "users", uid);
      await setDoc(userRef, {
        uid,
        email,
        name: "Commander Admin",
        role: "ADMIN",
        accessLevel: 5,
        createdAt: serverTimestamp(),
        status: "ACTIVE"
      }, { merge: true });
      
      return "Admin Seeding Complete";
    } catch (e) {
      console.error("Seeding Error (User might not exist in Auth yet):", e);
      throw e;
    }
  }
};