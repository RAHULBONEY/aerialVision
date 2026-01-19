import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
console.log(API_BASE_URL);
const ROLE_ROUTES = {
    ADMIN: "/admin",
    TRAFFIC_POLICE: "/police",
    EMERGENCY: "/hospital",
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {


        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {


            try {
                if (!firebaseUser) {

                    setUser(null);
                    setLoading(false);
                    return;
                }


                const idToken = await firebaseUser.getIdToken(true);


                const res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
                    headers: { Authorization: `Bearer ${idToken}` },
                });



                if (!res.ok) {
                    throw new Error(`Profile fetch failed: ${res.status}`);
                }

                const responseData = await res.json();


                const userData = responseData.data;
                setUser(userData);


                const currentPath = window.location.pathname;
                const targetRoute = ROLE_ROUTES[userData.role] || "/dashboard";
                if (currentPath === "/" || !currentPath.startsWith(targetRoute)) {

                    navigate(targetRoute, { replace: true });
                }

            } catch (err) {
                console.error("Session bootstrap failed:", err);
                setUser(null);
                await signOut(auth);
            } finally {

                setLoading(false);
            }
        });

        return () => {

            unsubscribe();
        };
    }, [navigate]);

    const logout = async () => {
        await signOut(auth);
        setUser(null);
        navigate("/", { replace: true });
    };

    return (
        <AuthContext.Provider value={{ user, loading, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
    return ctx;
};