/**
 * Página de Proveedores - Gestión completa de proveedores
 */
import { useState, useCallback } from 'react';
import { useConfirm } from '@/hooks/useConfirm';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Truck } from 'lucide-react';
import { useShortcutAction } from '@/hooks/useKeyboardShortcuts';

import { Button } from '@/components/ui/button';
import { FormDialog } from '@/components/ui/form-dialog';

import { SupplierList } from '@/features/suppliers/components/SupplierList';
import { SupplierForm } from '@/features/suppliers/components/SupplierForm';
import { SupplierStats } from '@/features/suppliers/components/SupplierStats';
import { suppliersApi } from '@/features/suppliers/api/suppliers.api';
import { Supplier } from '@/features/suppliers/types';
import { SupplierFormValues } from '@/features/suppliers/schemas/supplier.schema';

export default function SuppliersPage() {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const queryClient = useQueryClient();
    const confirm = useConfirm();

    // Query para estadísticas
    const { data: stats } = useQuery({
        queryKey: ['suppliers-stats'],
        queryFn: () => suppliersApi.getStats(),
    });

    // Callback para abrir modal de nuevo proveedor (usado por botón y atajo F7)
    const openCreateModal = useCallback(() => {
        setIsCreateOpen(true);
    }, []);

    // Atajo de teclado F7 para nuevo proveedor
    useShortcutAction('NEW_SUPPLIER', openCreateModal);

    // Mutations
    const createMutation = useMutation({
        mutationFn: suppliersApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            queryClient.invalidateQueries({ queryKey: ['suppliers-stats'] });
            queryClient.invalidateQueries({ queryKey: ['supplier-classifications'] });
            toast.success('Proveedor creado');
            setIsCreateOpen(false);
        },
        onError: (error: Error & { response?: { data?: { message?: string } } }) => {
            toast.error(error.response?.data?.message || 'Error al crear proveedor');
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: SupplierFormValues }) =>
            suppliersApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            queryClient.invalidateQueries({ queryKey: ['suppliers-stats'] });
            queryClient.invalidateQueries({ queryKey: ['supplier-classifications'] });
            toast.success('Proveedor actualizado');
            setEditingSupplier(null);
        },
        onError: (error: Error & { response?: { data?: { message?: string } } }) => {
            toast.error(error.response?.data?.message || 'Error al actualizar proveedor');
        },
    });

    const toggleStatusMutation = useMutation({
        mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
            suppliersApi.update(id, { isActive }),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            queryClient.invalidateQueries({ queryKey: ['suppliers-stats'] });
            queryClient.invalidateQueries({ queryKey: ['supplier-classifications'] });
            toast.success(variables.isActive ? 'Proveedor activado' : 'Proveedor desactivado');
        },
        onError: () => {
            toast.error('Error al cambiar estado del proveedor');
        },
    });

    // Handlers
    const handleCreate = (data: SupplierFormValues) => {
        createMutation.mutate(data);
    };

    const handleUpdate = (data: SupplierFormValues) => {
        if (!editingSupplier) return;
        updateMutation.mutate({ id: editingSupplier.id, data });
    };

    const handleToggleStatus = async (id: string) => {
        const supplier = await suppliersApi.getOne(id);
        const newStatus = !supplier.isActive;
        const action = newStatus ? 'activar' : 'desactivar';

        const confirmed = await confirm({
            title: newStatus ? 'Activar proveedor' : 'Desactivar proveedor',
            description: `¿Estás seguro de ${action} este proveedor?`,
            variant: newStatus ? 'default' : 'warning',
            confirmLabel: newStatus ? 'Activar' : 'Desactivar',
        });
        if (confirmed) {
            toggleStatusMutation.mutate({ id, isActive: newStatus });
        }
    };

    const handleEdit = (supplier: Supplier) => {
        setEditingSupplier(supplier);
    };

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Proveedores</h1>
                    <p className="text-muted-foreground">
                        Gestiona los proveedores de tu negocio
                    </p>
                </div>

                {/* Botón crear proveedor */}
                <Button onClick={openCreateModal}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Proveedor
                </Button>
            </div>

            {/* Estadísticas */}
            {stats ? <SupplierStats stats={stats} /> : null}

            {/* Lista de proveedores */}
            <div className="bg-card rounded-lg border shadow-sm p-6">
                <SupplierList onEdit={handleEdit} onDelete={handleToggleStatus} />
            </div>

            {/* Modal de creación premium */}
            <FormDialog
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                title="Nuevo Proveedor"
                description="Ingresa los datos del nuevo proveedor"
                icon={Truck}
                variant="info"
                maxWidth="2xl"
            >
                <div className="max-h-[60vh] overflow-y-auto pr-2">
                    <SupplierForm
                        onSubmit={handleCreate}
                        isLoading={createMutation.isPending}
                    />
                </div>
            </FormDialog>

            {/* Modal de edición premium */}
            <FormDialog
                open={!!editingSupplier}
                onOpenChange={(open) => !open && setEditingSupplier(null)}
                title="Editar Proveedor"
                description="Modifica los datos del proveedor"
                icon={Truck}
                variant="info"
                maxWidth="2xl"
            >
                <div className="max-h-[60vh] overflow-y-auto pr-2">
                    {editingSupplier ? (
                        <SupplierForm
                            initialData={{
                                name: editingSupplier.name,
                                tradeName: editingSupplier.tradeName || '',
                                documentType: editingSupplier.documentType || null,
                                documentNumber: editingSupplier.documentNumber || '',
                                ivaCondition: editingSupplier.ivaCondition || null,
                                email: editingSupplier.email || '',
                                phone: editingSupplier.phone || '',
                                mobile: editingSupplier.mobile || '',
                                address: editingSupplier.address || '',
                                city: editingSupplier.city || '',
                                state: editingSupplier.state || '',
                                postalCode: editingSupplier.postalCode || '',
                                website: editingSupplier.website || '',
                                contactName: editingSupplier.contactName || '',
                                bankAccount: editingSupplier.bankAccount || '',
                                notes: editingSupplier.notes || '',
                                classification: editingSupplier.classification || '',
                                isActive: editingSupplier.isActive,
                            }}
                            onSubmit={handleUpdate}
                            isLoading={updateMutation.isPending}
                            isEditing
                        />
                    ) : null}
                </div>
            </FormDialog>
        </div>
    );
}

