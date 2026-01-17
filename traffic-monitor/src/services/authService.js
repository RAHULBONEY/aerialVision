
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase"; // Ensure this points to your firebase config
const ROLE_PERMISSIONS = {
  TRAFFIC_POLICE: [
    "incidents:read",
    "incidents:write",
    "traffic:control",
    "streams:view",
    "streams:assign",
  ],
  EMERGENCY: [
    "incidents:read",
    "incidents:write",
    "streams:view",
  ],
  ADMIN: [
    "users:read",
    "users:write",
    "streams:view",
    "streams:assign",
    "model:configure",
  ],
};

export const AuthService = {
  /**
   * Logs the user in, verifies role in Firestore, and sets LocalStorage.
   */
  login: async ({ email, password }) => {
    try {
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const { uid } = userCredential.user;

      
      const userDocRef = doc(db, "users", uid);
      const userDoc = await getDoc(userDocRef);

      
      if (!userDoc.exists()) {
        await signOut(auth); // Force logout
        throw new Error("ACCESS_DENIED: No operator profile found.");
      }

      const userData = userDoc.data();

     
      if (userData.status === 'SUSPENDED') {
        await signOut(auth);
        throw new Error("ACCESS_REVOKED: Operator account suspended.");
      }

      
      const sessionData = {
        uid: uid,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        token: await userCredential.user.getIdToken(), 
      };

      
      localStorage.setItem("aerial_vision_user", JSON.stringify(sessionData));

      return sessionData;
    } catch (error) {
      
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