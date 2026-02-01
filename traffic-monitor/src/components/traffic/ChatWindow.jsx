import React, { useState, useRef, useEffect } from 'react';
import { Send, ArrowLeft, Radio } from 'lucide-react';
import { useMessages, useSendMessage } from '@/hooks/useMessages';
import MessageBubble from './MessageBubble';
import { auth } from '@/lib/firebase';


export default function ChatWindow({ chat, recipient, onBack }) {
    const [messageText, setMessageText] = useState('');
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const { data: messages, isLoading } = useMessages(chat?.chatId);
    const sendMessage = useSendMessage();

    const currentUserId = auth.currentUser?.uid;


    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);


    useEffect(() => {
        inputRef.current?.focus();
    }, [chat?.chatId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!messageText.trim() || !chat?.chatId) return;

        try {
            await sendMessage.mutateAsync({
                chatId: chat.chatId,
                text: messageText.trim(),
            });
            setMessageText('');
        } catch (err) {
            console.error('Failed to send message:', err);
        }
    };


    if (!chat) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-[#060d18]">
                <div className="text-center">
                    <Radio className="w-16 h-16 text-gray-300 dark:text-slate-700 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-500 dark:text-slate-500">
                        Select an Officer
                    </h3>
                    <p className="text-sm text-gray-400 dark:text-slate-600 mt-1">
                        Choose a colleague to start emergency coordination
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-white dark:bg-[#060d18] h-full">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-[#0a1525]">
                {/* Back button (mobile) */}
                <button
                    onClick={onBack}
                    className="lg:hidden p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                >
                    <ArrowLeft size={20} className="text-gray-600 dark:text-slate-400" />
                </button>

                {/* Recipient info */}
                <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                        {recipient?.name || 'Officer'}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-slate-500">
                        Emergency Channel • Secure
                    </p>
                </div>

                {/* Status indicator */}
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-xs text-gray-500 dark:text-slate-500">Active</span>
                </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : messages?.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-center">
                        <div>
                            <p className="text-gray-400 dark:text-slate-500 text-sm">
                                No messages yet
                            </p>
                            <p className="text-gray-300 dark:text-slate-600 text-xs mt-1">
                                Start the conversation with a professional message
                            </p>
                        </div>
                    </div>
                ) : (
                    messages?.map((msg) => (
                        <MessageBubble
                            key={msg.messageId}
                            message={msg}
                            isOwn={msg.senderId === currentUserId}
                        />
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <form
                onSubmit={handleSubmit}
                className="p-4 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-[#0a1525]"
            >
                <div className="flex items-center gap-3">
                    <input
                        ref={inputRef}
                        type="text"
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 px-4 py-2.5 rounded-xl bg-white dark:bg-[#0d1a2d] border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                    <button
                        type="submit"
                        disabled={!messageText.trim() || sendMessage.isPending}
                        className="p-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send size={20} />
                    </button>
                </div>
            </form>
        </div>
    );
}
