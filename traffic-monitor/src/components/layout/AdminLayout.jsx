import { Outlet } from "react-router-dom";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminLayout() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <AdminSidebar />

            <div className="pl-20 lg:pl-64 transition-all duration-300">
                <main className="p-6">
                    <div className="max-w-7xl mx-auto">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg">
                            <Outlet />
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}