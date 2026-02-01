import React from 'react';
import { User, MessageSquare, Clock } from 'lucide-react';
import { useTrafficPolice } from '@/hooks/useTrafficPolice';


export default function PoliceList({ onSelectOfficer, selectedOfficerId, existingChats }) {
    const { data: officers, isLoading, error } = useTrafficPolice();


    const getChatWithOfficer = (officerUid) => {
        return existingChats?.find((chat) =>
            chat.participants?.includes(officerUid)
        );
    };


    const formatLastSeen = (timestamp) => {
        if (!timestamp) return 'Never';

        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp._seconds * 1000);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString();
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 text-center">
                <p className="text-red-500 dark:text-red-400 text-sm">
                    Failed to load directory
                </p>
            </div>
        );
    }

    if (!officers?.length) {
        return (
            <div className="p-6 text-center">
                <User className="w-12 h-12 text-gray-300 dark:text-slate-700 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-slate-500 text-sm">
                    No other officers online
                </p>
            </div>
        );
    }

    return (
        <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {officers.map((officer) => {
                const existingChat = getChatWithOfficer(officer.uid);
                const isSelected = selectedOfficerId === officer.uid;

                return (
                    <button
                        key={officer.uid}
                        onClick={() => onSelectOfficer(officer, existingChat)}
                        className={`w-full flex items-center gap-3 p-4 text-left transition-colors ${isSelected
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-l-3 border-blue-500'
                            : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'
                            }`}
                    >
                        {/* Avatar */}
                        <div className="relative">
                            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold text-sm">
                                {officer.name?.charAt(0)?.toUpperCase() || 'O'}
                            </div>
                            {/* Online indicator */}
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                                <h4 className="font-medium text-gray-900 dark:text-white truncate">
                                    {officer.name}
                                </h4>
                                {existingChat?.lastMessage && (
                                    <span className="text-[10px] text-gray-400 dark:text-slate-500 flex-shrink-0">
                                        {formatLastSeen(existingChat.lastUpdatedAt)}
                                    </span>
                                )}
                            </div>

                            {/* Last message preview or badge */}
                            <div className="flex items-center gap-2 mt-0.5">
                                {existingChat?.lastMessage ? (
                                    <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                                        {existingChat.lastMessage}
                                    </p>
                                ) : (
                                    <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-slate-500">
                                        <MessageSquare size={12} />
                                        <span>Start conversation</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
