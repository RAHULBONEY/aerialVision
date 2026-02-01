import React from 'react';

//chat bubble ui
export default function MessageBubble({ message, isOwn }) {

    const formatTime = (timestamp) => {
        if (!timestamp) return '';


        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp._seconds * 1000);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}>
            <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isOwn
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white rounded-bl-md'
                    }`}
            >
                {/* Sender name for received messages */}
                {!isOwn && (
                    <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                        {message.senderName}
                    </p>
                )}

                {/* Message text */}
                <p className="text-sm leading-relaxed break-words">{message.text}</p>

                {/* Timestamp */}
                <p
                    className={`text-[10px] mt-1 ${isOwn ? 'text-blue-200' : 'text-gray-400 dark:text-slate-500'
                        }`}
                >
                    {formatTime(message.createdAt)}
                </p>
            </div>
        </div>
    );
}
