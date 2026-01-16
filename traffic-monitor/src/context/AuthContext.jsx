import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
    const logout = () => signOut(auth);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const userRef = doc(db, 'users', firebaseUser.uid);
                const userDoc = await getDoc(userRef);

                let userData;

                if (!userDoc.exists()) {
                    // AUTO-SEED: If user exists in Auth but not Firestore, create them as Admin automatically
                    userData = {
                        name: firebaseUser.email.split('@')[0].toUpperCase(),
                        role: 'admin', // Defaulting to admin so you aren't locked out
                        email: firebaseUser.email,
                        createdAt: serverTimestamp()
                    };
                    await setDoc(userRef, userData);
                    console.log("🚀 System: New Operator Auto-Registered in Firestore");
                } else {
                    userData = userDoc.data();
                }

                setUser({
                    uid: firebaseUser.uid,
                    ...userData
                });
            } else {
                setUser(null);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);