// Streams.jsx
import { useStreams } from "@/hooks/useStreams";
import { useState } from "react";
import CreateStreamModal from "../../components/admin/CreateStreamModal";
import { UserPlus, X } from "lucide-react";

function StreamCard({ stream, onStop }) {
    return (
        <div className="w-full mb-8">
            {/* Minimal header overlay */}
            <div className="flex justify-between items-center mb-3 px-2">
                <div>
                    <h2 className="text-lg font-bold">{stream.name}</h2>
                    <p className="text-sm text-muted-foreground">
                        {stream.type} • {stream.status} • {stream.model?.name}
                    </p>
                </div>
                <button
                    onClick={() => onStop(stream.id)}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg flex items-center gap-2"
                >
                    <X className="w-4 h-4" />
                    Stop Stream
                </button>
            </div>

            {/* Video takes full width */}
            <div className="w-full bg-black rounded-lg overflow-hidden">
                <iframe
                    src={stream.aiEngineUrl}
                    className="w-full"
                    style={{
                        height: '70vh',  // 70% of viewport height
                        minHeight: '600px',
                        border: 'none'
                    }}
                    allow="autoplay"
                />
            </div>
        </div>
    );
}

export default function Streams() {
    const { data = [], createStream, stopStream } = useStreams();
    const [open, setOpen] = useState(false);

    return (
        <div className="space-y-6 px-4">
            <header className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Live Streams</h1>
            </header>

            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold rounded-lg transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
            >
                <UserPlus className="w-5 h-5" />
                Add Stream
            </button>

            {/* Single column, full width */}
            <div className="w-full space-y-8">
                {data.map((stream) => (
                    <StreamCard
                        key={stream.id}
                        stream={stream}
                        onStop={stopStream}
                    />
                ))}
            </div>

            <CreateStreamModal
                open={open}
                onClose={() => setOpen(false)}
                onCreate={createStream}
            />
        </div>
    );
}