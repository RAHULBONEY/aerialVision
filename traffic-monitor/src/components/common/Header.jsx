import { Bell, Search } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeProvider";

export default function Header({ title }) {
    const { user } = useAuth();
    const { theme } = useTheme();

    const headerBg = theme === 'dark'
        ? 'bg-slate-900/80 border-slate-800'
        : 'bg-white/80 border-slate-200';

    const searchBg = theme === 'dark'
        ? 'bg-slate-800 border-slate-700'
        : 'bg-slate-100 border-slate-300';

    const textColor = theme === 'dark' ? 'text-slate-200' : 'text-slate-800';
    const mutedTextColor = theme === 'dark' ? 'text-slate-400' : 'text-slate-500';

    return (
        <header className={`sticky top-0 z-30 h-16 border-b ${headerBg} backdrop-blur-xl px-6 flex items-center justify-between`}>
            <h1 className={`text-xl font-bold ${textColor}`}>
                {title}
            </h1>

            <div className="flex items-center gap-4">
                <div className="relative">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${mutedTextColor}`} />
                    <input
                        type="text"
                        placeholder="Search..."
                        className={`pl-10 pr-4 py-2 w-64 rounded-lg ${searchBg} text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    />
                </div>

                <button className={`relative p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-100'} transition-all`}>
                    <Bell className={`w-5 h-5 ${mutedTextColor}`} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>

                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                            {user?.name?.charAt(0) || "A"}
                        </span>
                    </div>
                    <div className="hidden md:block text-right">
                        <p className={`text-sm font-semibold ${textColor}`}>
                            {user?.name || "Administrator"}
                        </p>
                        <p className={`text-xs ${mutedTextColor}`}>
                            {user?.role || "Admin"}
                        </p>
                    </div>
                </div>
            </div>
        </header>
    );
}