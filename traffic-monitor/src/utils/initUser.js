import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

/**
 * Call this function to manually set a user's role in Firestore.
 * You must first create the user in Firebase Authentication and get their UID.
 */
export const initializeUserInFirestore = async (uid, email, name, role = 'admin') => {
  try {
    await setDoc(doc(db, "users", uid), {
      name: name,
      email: email,
      role: role, // 'admin', 'traffic-police', 'hospital', 'viewer'
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      status: 'active'
    });
    console.log("✅ User Role successfully initialized in Firestore");
  } catch (error) {
    console.error("❌ Error initializing user:", error);
  }
};