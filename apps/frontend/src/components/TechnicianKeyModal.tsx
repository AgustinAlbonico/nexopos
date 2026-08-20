import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { KeyRound, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/axios';

interface TechnicianKeyModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUnlocked: (key: string) => void;
}

export function TechnicianKeyModal({ open, onOpenChange, onUnlocked }: TechnicianKeyModalProps) {
    const [key, setKey] = useState('');

    const verifyMutation = useMutation({
        mutationFn: async (keyToVerify: string) => {
            const response = await api.post('/api/configuration/verify-technician-key', { key: keyToVerify });
            return response.data as { valid: boolean };
        },
        onSuccess: (data) => {
            if (data.valid) {
                toast.success('Modo técnico desbloqueado');
                onUnlocked(key);
                onOpenChange(false);
                setKey('');
            } else {
                toast.error('Clave técnica incorrecta');
            }
        },
        onError: () => {
            toast.error('Error al verificar la clave técnica');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (key.trim()) {
            verifyMutation.mutate(key);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader className="space-y-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600">
                        <Lock className="h-6 w-6" />
                    </div>
                    <DialogTitle className="text-xl font-bold">
                        Modo Técnico Requerido
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Para cambiar el perfil de negocio o alterar capacidades estructurales se requiere la contraseña técnica de administración.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="technician-key">Clave de Desarrollador / Técnico</Label>
                        <div className="relative">
                            <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="technician-key"
                                type="password"
                                placeholder="••••••••"
                                value={key}
                                onChange={(e) => setKey(e.target.value)}
                                className="pl-9"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={!key.trim() || verifyMutation.isPending}>
                            {verifyMutation.isPending && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Desbloquear
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
