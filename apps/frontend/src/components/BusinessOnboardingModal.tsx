import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Store,
    Wrench,
    Shirt,
    Scale,
    Calendar,
    Smartphone,
    Building2,
    CheckCircle2,
    Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { api } from '@/lib/axios';

export type BusinessTypeItem = {
    key: string;
    label: string;
    description: string;
    category: string;
    icon: React.ElementType;
};

export const BUSINESS_TYPES: BusinessTypeItem[] = [
    // Venta Simple
    { key: 'kiosco', label: 'Kiosco / Drugstore', description: 'Venta rápida por unidad entera', category: 'Venta Simple', icon: Store },
    { key: 'libreria', label: 'Librería / Papelería', description: 'Útiles y papelería', category: 'Venta Simple', icon: Store },
    { key: 'jugueteria', label: 'Juguetería', description: 'Juegos y juguetes', category: 'Venta Simple', icon: Store },
    { key: 'bazar', label: 'Bazar / Regalería', description: 'Artículos del hogar y regalos', category: 'Venta Simple', icon: Store },
    { key: 'cotillon', label: 'Cotillón', description: 'Artículos para fiestas', category: 'Venta Simple', icon: Store },

    // Ferretería
    { key: 'ferreteria', label: 'Ferretería', description: 'Medidas, acopios y catálogos masivos', category: 'Ferretería y Medidas', icon: Wrench },
    { key: 'pintureria', label: 'Pinturería', description: 'Fraccionado por litros y combos', category: 'Ferretería y Medidas', icon: Wrench },

    // Indumentaria
    { key: 'indumentaria', label: 'Indumentaria / Ropa', description: 'Matriz de talles y colores', category: 'Variantes', icon: Shirt },
    { key: 'calzado', label: 'Calzado / Zapatillería', description: 'Números de calzado y marcas', category: 'Variantes', icon: Shirt },
    { key: 'merceria', label: 'Mercería / Telas', description: 'Telas por metro y variantes', category: 'Variantes', icon: Shirt },

    // Peso
    { key: 'dietetica', label: 'Dietética / Prod. Naturales', description: 'Venta fraccionada y balanza', category: 'Venta por Peso', icon: Scale },
    { key: 'fiambreria', label: 'Fiambrería / Rotisería', description: 'Códigos EAN de balanza y peso', category: 'Venta por Peso', icon: Scale },
    { key: 'verduleria', label: 'Verdulería / Frutería', description: 'Frutas y verduras por peso', category: 'Venta por Peso', icon: Scale },
    { key: 'granel', label: 'Granel (Legumbres/Especias)', description: 'Fraccionamiento dinámico', category: 'Venta por Peso', icon: Scale },

    // Vencimientos
    { key: 'perfumeria', label: 'Perfumería / Cosmética', description: 'Trazabilidad de lotes y fechas', category: 'Vencimientos', icon: Calendar },
    { key: 'veterinaria', label: 'Veterinaria', description: 'Insumos y productos con vencimiento', category: 'Vencimientos', icon: Calendar },

    // Electrónica
    { key: 'electronica', label: 'Electrónica / Computación', description: 'Números de serie y garantía', category: 'Garantía y Seriales', icon: Smartphone },
    { key: 'electrodomesticos', label: 'Electrodomésticos', description: 'Equipos y garantías', category: 'Garantía y Seriales', icon: Smartphone },
    { key: 'celulares', label: 'Celulares y Accesorios', description: 'Equipos con IMEI', category: 'Garantía y Seriales', icon: Smartphone },

    // Mayorista
    { key: 'mayorista', label: 'Mayorista Genérico', description: 'Listas de precios y escala por cantidad', category: 'Mayorista', icon: Building2 },
];

interface BusinessOnboardingModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function BusinessOnboardingModal({ open, onOpenChange }: BusinessOnboardingModalProps) {
    const queryClient = useQueryClient();
    const [selectedKey, setSelectedKey] = useState<string | null>(null);

    const onboardingMutation = useMutation({
        mutationFn: async (businessTypeKey: string) => {
            await api.post('/api/configuration/onboarding', { businessTypeKey });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['configuration', 'capabilities'] });
            toast.success('¡Perfil de negocio configurado con éxito!');
            onOpenChange(false);
        },
        onError: () => {
            toast.error('No se pudo guardar la selección del perfil');
        },
    });

    const handleConfirm = () => {
        if (selectedKey) {
            onboardingMutation.mutate(selectedKey);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
                <DialogHeader className="space-y-2">
                    <DialogTitle className="text-2xl font-bold text-center">
                        ¡Bienvenido! Configurá tu Punto de Venta
                    </DialogTitle>
                    <DialogDescription className="text-center text-sm">
                        Seleccioná el rubro principal de tu negocio. El sistema activará únicamente las herramientas que necesitás.
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {BUSINESS_TYPES.map((type) => {
                        const Icon = type.icon;
                        const isSelected = selectedKey === type.key;
                        return (
                            <button
                                key={type.key}
                                type="button"
                                onClick={() => setSelectedKey(type.key)}
                                className={`flex flex-col justify-between rounded-xl border p-4 text-left transition-all hover:border-primary hover:shadow-md ${
                                    isSelected
                                        ? 'border-primary bg-primary/5 ring-2 ring-primary'
                                        : 'bg-card'
                                }`}
                            >
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        {isSelected && (
                                            <CheckCircle2 className="h-5 w-5 text-primary" />
                                        )}
                                    </div>
                                    <h3 className="font-semibold text-sm">{type.label}</h3>
                                    <p className="text-xs text-muted-foreground">{type.description}</p>
                                </div>
                                <span className="mt-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">
                                    {type.category}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div className="mt-6 flex items-center justify-end gap-3 border-t pt-4">
                    <Button
                        size="lg"
                        className="w-full sm:w-auto"
                        disabled={!selectedKey || onboardingMutation.isPending}
                        onClick={handleConfirm}
                    >
                        {onboardingMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Confirmar e Iniciar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
