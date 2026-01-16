import { Badge } from "@/components/ui/badge";

export default function VideoPanel() {
    return (
        <div className="relative h-full w-full rounded-xl border border-[#1E3A5F] bg-black overflow-hidden shadow-2xl">
            {/* Background Image Illusion  */}
            <img
                src="/testimage.jpg"
                className="h-full w-full object-cover opacity-60"
                alt="Live Feed"
            />

            {/* Mock AI Bounding Boxes [cite: 30, 77] */}
            <div className="absolute top-1/4 left-1/3 h-24 w-32 border-2 border-[#00E5FF] rounded-sm">
                <span className="absolute -top-6 left-0 bg-[#00E5FF] text-[10px] px-1 font-bold text-[#0B1C2D]">
                    ID: 842 | 45 km/h [cite: 4, 5, 78]
                </span>
            </div>

            <div className="absolute bottom-1/3 right-1/4 h-32 w-48 border-2 border-[#FF8C00] rounded-sm animate-pulse">
                <span className="absolute -top-6 left-0 bg-[#FF8C00] text-[10px] px-1 font-bold text-white uppercase">
                    🚨 AMBULANCE DETECTED [cite: 7, 51]
                </span>
            </div>

            {/* Congestion Banner Overlay [cite: 6, 50] */}
            <div className="absolute top-4 right-4">
                <Badge className="bg-[#E53935] text-white animate-bounce border-none px-4 py-1">
                    HIGH CONGESTION [cite: 74]
                </Badge>
            </div>

            <div className="absolute bottom-4 left-4 font-mono text-[10px] text-[#00E5FF]">
                CAM_01 // SECURE_FEED // 60 FPS
            </div>
        </div>
    );
}