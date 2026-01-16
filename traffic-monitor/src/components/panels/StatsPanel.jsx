import { Card } from "@/components/ui/card";

export default function StatsPanel() {
    const stats = [
        { label: "Congestion Level", value: "MEDIUM", color: "text-[#FF8C00]" }, // [cite: 10]
        { label: "Vehicle Count", value: "142", color: "text-[#00E5FF]" },       // [cite: 11]
        { label: "Average Speed", value: "32 km/h", color: "text-[#EAEAEA]" }  // [cite: 12]
    ];

    return (
        <div className="space-y-4">
            {stats.map((stat, i) => (
                <Card key={i} className="bg-[#162F4A] border-[#1E3A5F] p-4 shadow-lg">
                    <p className="text-[10px] font-bold text-[#9AA4AF] uppercase tracking-widest">
                        {stat.label}
                    </p>
                    <p className={`text-2xl font-black mt-1 ${stat.color}`}>
                        {stat.value}
                    </p>
                </Card>
            ))}
        </div>
    );
}