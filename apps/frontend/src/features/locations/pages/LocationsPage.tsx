/**
 * LocationsPage (PR7) — gestión de ubicaciones físicas.
 * Tabla con activas primero, inactivas al final (el backend ya devuelve en
 * ese orden). Botón "Nueva ubicación" abre el dialog de alta.
 *
 * Si el modo sectorizado está apagado, muestra el banner de activación
 * (cubre el caso de un admin que entra a la pantalla antes de correr el
 * asistente).
 */
import { useState } from 'react';
import { Plus, Pencil, PowerOff, Loader2, Boxes } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { LocationFormDialog } from '../components/LocationFormDialog';
import { ActivationBanner } from '../components/ActivationBanner';
import { useConfirm } from '@/hooks/useConfirm';
import {
    useLocations,
    useCreateLocation,
    useUpdateLocation,
    useDeactivateLocation,
    useSystemConfig,
} from '../hooks/useLocations';
import type { Location } from '../types';
import { FUNCTION_LABEL, LocationFunction } from '../types';
import type { LocationFormValues } from '../schemas/location.schema';

export function LocationsPage() {
    const { data: locations, isLoading } = useLocations();
    const { data: systemConfig } = useSystemConfig();
    const create = useCreateLocation();
    const update = useUpdateLocation();
    const deactivate = useDeactivateLocation();
    const confirm = useConfirm();

    const [createOpen, setCreateOpen] = useState(false);
    const [editing, setEditing] = useState<Location | null>(null);

    const handleCreate = async (values: LocationFormValues) => {
        await create.mutateAsync({
            name: values.name,
            function: values.function as LocationFunction,
            isPrimarySale: values.isPrimarySale || undefined,
            isDefaultReceive: values.isDefaultReceive || undefined,
        });
        setCreateOpen(false);
    };

    const handleEdit = async (values: LocationFormValues) => {
        if (!editing) return;
        await update.mutateAsync({
            id: editing.id,
            dto: {
                name: values.name,
                function: values.function as LocationFunction,
            },
        });
        setEditing(null);
    };

    const handleDeactivate = async (loc: Location) => {
        const ok = await confirm({
            title: 'Desactivar ubicación',
            description: `¿Desactivar "${loc.name}"? No recibirá nuevos movimientos. Si tiene stock, la operación será rechazada por el sistema.`,
        });
        if (!ok) return;
        await deactivate.mutateAsync(loc.id);
    };

    return (
        <div className="container mx-auto p-4 sm:p-6 space-y-4">
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Ubicaciones</h1>
                    <p className="text-sm text-muted-foreground">
                        Gestioná las ubicaciones físicas del inventario (salón, depósito, mostrador).
                    </p>
                </div>
                <Button onClick={() => setCreateOpen(true)}>
                    <Plus className="mr-1 h-4 w-4" />
                    Nueva ubicación
                </Button>
            </header>

            {systemConfig && !systemConfig.stockSectorizado ? (
                <ActivationBanner
                    description="El modo sectorizado está desactivado. Las ubicaciones que crees acá no afectarán el stock hasta que completes el asistente de activación."
                />
            ) : null}

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Función</TableHead>
                            <TableHead>Roles</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="w-32 text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8">
                                    <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
                                    Cargando ubicaciones…
                                </TableCell>
                            </TableRow>
                        ) : !locations || locations.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    <Boxes className="inline h-5 w-5 mr-2 opacity-50" />
                                    Todavía no hay ubicaciones. Creá la primera con el botón de arriba.
                                </TableCell>
                            </TableRow>
                        ) : (
                            locations.map((loc) => (
                                <TableRow
                                    key={loc.id}
                                    className={loc.isActive ? '' : 'opacity-50'}
                                    data-testid={`location-row-${loc.name}`}
                                >
                                    <TableCell className="font-medium">{loc.name}</TableCell>
                                    <TableCell>{FUNCTION_LABEL[loc.function]}</TableCell>
                                    <TableCell className="space-x-1">
                                        {loc.isPrimarySale && (
                                            <Badge variant="default" className="text-xs">Primaria venta</Badge>
                                        )}
                                        {loc.isDefaultReceive && (
                                            <Badge variant="secondary" className="text-xs">Destino compras</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {loc.isActive ? (
                                            <span className="text-emerald-600 text-sm">Activa</span>
                                        ) : (
                                            <span className="text-muted-foreground text-sm">Inactiva</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right space-x-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setEditing(loc)}
                                            disabled={!loc.isActive}
                                            aria-label={`Editar ${loc.name}`}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDeactivate(loc)}
                                            disabled={!loc.isActive}
                                            aria-label={`Desactivar ${loc.name}`}
                                        >
                                            <PowerOff className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <LocationFormDialog
                open={createOpen}
                onOpenChange={setCreateOpen}
                onSubmit={handleCreate}
                isSubmitting={create.isPending}
            />

            <LocationFormDialog
                open={Boolean(editing)}
                onOpenChange={(o) => !o && setEditing(null)}
                onSubmit={handleEdit}
                initial={editing}
                isSubmitting={update.isPending}
                disableFlags
            />
        </div>
    );
}

export default LocationsPage;
