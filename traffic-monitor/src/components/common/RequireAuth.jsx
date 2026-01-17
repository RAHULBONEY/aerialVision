import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";

export default function RequireAuth({ role, children }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    useEffect(() => {
        console.log("RequireAuth check:", {
            loading,
            user: user?.role,
            requiredRole: role,
            path: location.pathname
        });
    }, [loading, user, role, location]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 text-slate-600 dark:text-slate-400">Loading authentication...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        console.log("No user found, redirecting to login");
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    if (role && user.role !== role) {
        console.log(`User role ${user.role} doesn't match required role ${role}`);
        return <Navigate to="/" replace />;
    }

    console.log("User authenticated, rendering protected content");
    return children;
}