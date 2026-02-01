import React, { useState } from 'react';
import { Radio, Users, RefreshCw } from 'lucide-react';
import PoliceList from '@/components/traffic/PoliceList';
import ChatWindow from '@/components/traffic/ChatWindow';
import { useChats, useCreateChat } from '@/hooks/useChats';

/**
 * Emergency Communications page
 * Split layout: Police directory (left) + Chat window (right)
 * Mobile: Full-screen toggle between list and chat
 */
export default function EmergencyComms() {
    const [selectedOfficer, setSelectedOfficer] = useState(null);
    const [activeChat, setActiveChat] = useState(null);
    const [showChat, setShowChat] = useState(false); // Mobile toggle

    const { data: chats, isLoading: loadingChats, refetch: refetchChats } = useChats();
    const createChat = useCreateChat();

    // Handle officer selection
    const handleSelectOfficer = async (officer, existingChat) => {
        setSelectedOfficer(officer);

        if (existingChat) {
            setActiveChat(existingChat);
        } else {
            // Create new chat
            try {
                const chat = await createChat.mutateAsync(officer.uid);
                setActiveChat(chat);
            } catch (err) {
                console.error('Failed to create chat:', err);
            }
        }

        // Show chat on mobile
        setShowChat(true);
    };

    // Handle back on mobile
    const handleBack = () => {
        setShowChat(false);
    };

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-[#0a1525]">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-500/10 rounded-lg">
                        <Radio className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                            Emergency Communications
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-slate-400">
                            Secure channel for incident coordination
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => refetchChats()}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                >
                    <RefreshCw size={16} />
                    <span className="hidden sm:inline">Refresh</span>
                </button>
            </div>

            {/* Main content - split view */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left panel - Police directory */}
                <div
                    className={`w-full lg:w-80 xl:w-96 border-r border-gray-200 dark:border-slate-800 bg-white dark:bg-[#0a1525] flex flex-col ${showChat ? 'hidden lg:flex' : 'flex'
                        }`}
                >
                    {/* Directory header */}
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-slate-800">
                        <Users size={16} className="text-gray-400 dark:text-slate-500" />
                        <span className="text-sm font-medium text-gray-600 dark:text-slate-400">
                            Traffic Police Directory
                        </span>
                    </div>

                    {/* Officer list */}
                    <div className="flex-1 overflow-y-auto">
                        <PoliceList
                            onSelectOfficer={handleSelectOfficer}
                            selectedOfficerId={selectedOfficer?.uid}
                            existingChats={chats}
                        />
                    </div>
                </div>

                {/* Right panel - Chat window */}
                <div
                    className={`flex-1 ${showChat ? 'flex' : 'hidden lg:flex'
                        }`}
                >
                    <ChatWindow
                        chat={activeChat}
                        recipient={selectedOfficer}
                        onBack={handleBack}
                    />
                </div>
            </div>
        </div>
    );
}
