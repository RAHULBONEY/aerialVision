import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

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
        console.log("AuthProvider: Setting up auth listener");

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            console.log("Auth state changed:", firebaseUser);

            try {
                if (!firebaseUser) {
                    console.log("No firebase user, setting user to null");
                    setUser(null);
                    setLoading(false);
                    return;
                }

                console.log("Firebase user found, getting ID token");
                const idToken = await firebaseUser.getIdToken(true);
                console.log("ID token received, fetching profile");

                const res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
                    headers: { Authorization: `Bearer ${idToken}` },
                });

                console.log("Profile fetch response status:", res.status);

                if (!res.ok) {
                    throw new Error(`Profile fetch failed: ${res.status}`);
                }

                const responseData = await res.json();
                console.log("Profile data received:", responseData);

                const userData = responseData.data;
                setUser(userData);

                // Only navigate on initial login, not on page refresh
                // Check if we're already on the correct route
                const currentPath = window.location.pathname;
                const targetRoute = ROLE_ROUTES[userData.role] || "/dashboard";

                console.log("Current path:", currentPath, "Target route:", targetRoute);

                // Only navigate if we're on the login page or wrong route
                if (currentPath === "/" || !currentPath.startsWith(targetRoute)) {
                    console.log("Navigating to:", targetRoute);
                    navigate(targetRoute, { replace: true });
                }

            } catch (err) {
                console.error("Session bootstrap failed:", err);
                setUser(null);
                await signOut(auth);
            } finally {
                console.log("Auth loading completed");
                setLoading(false);
            }
        });

        return () => {
            console.log("AuthProvider: Cleaning up auth listener");
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