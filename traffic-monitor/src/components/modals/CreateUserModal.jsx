import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Shield, Car, Stethoscope } from 'lucide-react';
import { cn } from "@/lib/utils";

export function CreateUserModal({ isOpen, onClose, onCreate }) {
    const [formData, setFormData] = useState({ name: '', email: '', role: 'TRAFFIC_POLICE' });
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        await onCreate(formData);
        setIsLoading(false);
        onClose(); // Shadcn Dialog handles the animation automatically
    };

    // Role Definitions
    const roles = [
        {
            id: 'TRAFFIC_POLICE',
            label: 'Traffic Police',
            icon: Car,
            activeClass: 'border-blue-500 bg-blue-500/10 text-blue-400'
        },
        {
            id: 'EMERGENCY',
            label: 'Hospital Staff',
            icon: Stethoscope,
            activeClass: 'border-red-500 bg-red-500/10 text-red-400'
        },
        {
            id: 'ADMIN',
            label: 'System Admin',
            icon: Shield,
            activeClass: 'border-purple-500 bg-purple-500/10 text-purple-400'
        }
    ];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-[#0B1C2D] border-white/10 text-slate-200 sm:max-w-md">

                <DialogHeader>
                    <DialogTitle className="text-lg font-bold uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        Register New Node
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500 font-mono">
                        Authorize a new operator for secure network access.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 mt-2">

                    {/* Name Field */}
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-[10px] uppercase font-bold text-slate-500">
                            Officer / Staff Name
                        </Label>
                        <Input
                            id="name"
                            required
                            placeholder="e.g. Dr. Anjali or Officer Vikram"
                            className="bg-black/20 border-white/10 focus-visible:ring-primary font-mono"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    {/* Email Field */}
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-[10px] uppercase font-bold text-slate-500">
                            Secure ID (Email)
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            required
                            placeholder="user@aerialvision.gov"
                            className="bg-black/20 border-white/10 focus-visible:ring-primary font-mono"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>

                    {/* Custom Role Selection Grid */}
                    <div className="space-y-3">
                        <Label className="text-[10px] uppercase font-bold text-slate-500">
                            Clearance Level
                        </Label>
                        <div className="grid grid-cols-3 gap-3">
                            {roles.map((role) => (
                                <button
                                    key={role.id}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, role: role.id })}
                                    className={cn(
                                        "flex flex-col items-center gap-2 p-3 rounded-md border transition-all duration-200 hover:bg-white/5",
                                        formData.role === role.id
                                            ? role.activeClass
                                            : "border-white/10 text-slate-500"
                                    )}
                                >
                                    <role.icon size={20} />
                                    <span className="text-[9px] font-bold uppercase text-center leading-tight">
                                        {role.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Action Button */}
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-primary text-[#0B1C2D] font-bold tracking-widest hover:bg-primary/90"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ENCRYPTING...
                            </>
                        ) : (
                            "AUTHORIZE NODE"
                        )}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}