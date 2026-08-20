/**
 * Página de gestión de usuarios del sistema
 * CRUD completo con desactivación (no eliminación)
 */
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
    Users,
    Plus,
    Edit,
    ShieldCheck,
    ShieldOff,
    ArrowLeft,
    Mail,
    User,
    Key,
    Loader2,
    CheckCircle2,
    XCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Tipos
interface User {
    id: string;
    username: string;
    role?: 'admin' | 'manager' | 'cashier';
    email: string | null;
    firstName: string;
    lastName: string;
    isActive: boolean;
    lastLogin: string | null;
    createdAt: string;
}

interface CreateUserFormData {
    username: string;
    role?: 'admin' | 'manager' | 'cashier';
    email?: string;
    password: string;
    firstName: string;
    lastName: string;
}

interface UpdateUserFormData {
    username?: string;
    role?: 'admin' | 'manager' | 'cashier';
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
}

// API
const usersApi = {
    getAll: async (): Promise<User[]> => {
        const res = await api.get('/api/users');
        return res.data;
    },
    create: async (data: CreateUserFormData): Promise<User> => {
        const res = await api.post('/api/users', data);
        return res.data;
    },
    update: async (id: string, data: UpdateUserFormData): Promise<User> => {
        const res = await api.patch(`/api/users/${id}`, data);
        return res.data;
    },
    toggleStatus: async (id: string): Promise<User> => {
        const res = await api.patch(`/api/users/${id}/toggle-status`);
        return res.data;
    },
};

// Formulario de usuario
function UserFormDialog({
    open,
    onClose,
    user,
    onSuccess,
}: Readonly<{
    open: boolean;
    onClose: () => void;
    user: User | null;
    onSuccess: () => void;
}>) {
    const [formData, setFormData] = useState<CreateUserFormData>({
        username: '',
        role: 'admin',
        email: '',
        password: '',
        firstName: '',
        lastName: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const queryClient = useQueryClient();

    // Resetear form cuando cambia el usuario
    useEffect(() => {
        if (user) {
            setFormData({
                username: user.username,
                role: user.role || 'admin',
                email: user.email || '',
                password: '',
                firstName: user.firstName,
                lastName: user.lastName,
            });
        } else {
            setFormData({
                username: '',
                role: 'admin',
                email: '',
                password: '',
                firstName: '',
                lastName: '',
            });
        }
        setErrors({});
    }, [user, open]);

    const createMutation = useMutation({
        mutationFn: usersApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success('Usuario creado exitosamente');
            onSuccess();
            onClose();
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || 'Error al crear usuario';
            toast.error(message);
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateUserFormData }) =>
            usersApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success('Usuario actualizado exitosamente');
            onSuccess();
            onClose();
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || 'Error al actualizar usuario';
            toast.error(message);
        },
    });

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.username.trim()) {
            newErrors.username = 'El nombre de usuario es requerido';
        } else if (formData.username.length < 3) {
            newErrors.username = 'Mínimo 3 caracteres';
        } else if (!/^[a-z0-9]+$/.test(formData.username)) {
            newErrors.username = 'Solo letras minúsculas y números, sin espacios';
        }

        if (!formData.firstName.trim()) {
            newErrors.firstName = 'El nombre es requerido';
        }

        if (!formData.lastName.trim()) {
            newErrors.lastName = 'El apellido es requerido';
        }

        // Para usuarios nuevos, password es requerido
        if (!user && !formData.password) {
            newErrors.password = 'La contraseña es requerida';
        } else if (formData.password && formData.password.length < 6) {
            newErrors.password = 'Mínimo 6 caracteres';
        }

        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Email inválido';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        if (user) {
            // Actualizar
            const updateData: UpdateUserFormData = {
                username: formData.username,
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email || undefined,
            };
            // Solo enviar password si se escribió uno nuevo
            if (formData.password) {
                updateData.password = formData.password;
            }
            updateMutation.mutate({ id: user.id, data: updateData });
        } else {
            // Crear
            createMutation.mutate({
                ...formData,
                email: formData.email || undefined,
            });
        }
    };

    const isPending = createMutation.isPending || updateMutation.isPending;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        {user ? 'Editar Usuario' : 'Nuevo Usuario'}
                    </DialogTitle>
                    <DialogDescription>
                        {user
                            ? 'Modifica los datos del usuario'
                            : 'Ingresa los datos para crear un nuevo usuario del sistema'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">
                                <User className="inline h-3 w-3 mr-1" />
                                Nombre *
                            </Label>
                            <Input
                                id="firstName"
                                value={formData.firstName}
                                onChange={(e) =>
                                    setFormData({ ...formData, firstName: e.target.value })
                                }
                                placeholder="Juan"
                            />
                            {errors.firstName && (
                                <p className="text-xs text-destructive">{errors.firstName}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="lastName">Apellido *</Label>
                            <Input
                                id="lastName"
                                value={formData.lastName}
                                onChange={(e) =>
                                    setFormData({ ...formData, lastName: e.target.value })
                                }
                                placeholder="Pérez"
                            />
                            {errors.lastName && (
                                <p className="text-xs text-destructive">{errors.lastName}</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="username">
                            <Key className="inline h-3 w-3 mr-1" />
                            Usuario *
                        </Label>
                        <Input
                            id="username"
                            value={formData.username}
                            onChange={(e) =>
                                setFormData({ ...formData, username: e.target.value.toLowerCase() })
                            }
                            placeholder="juanperez"
                        />
                        {errors.username && (
                            <p className="text-xs text-destructive">{errors.username}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                            Solo letras minúsculas y números, sin espacios
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="role">
                            <ShieldCheck className="inline h-3 w-3 mr-1" />
                            Rol del Usuario *
                        </Label>
                        <select
                            id="role"
                            value={formData.role || 'admin'}
                            onChange={(e) =>
                                setFormData({ ...formData, role: e.target.value as 'admin' | 'manager' | 'cashier' })
                            }
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                            <option value="admin">Administrador (Acceso total)</option>
                            <option value="manager">Encargado / Gerente (Inventario, compras y reportes)</option>
                            <option value="cashier">Cajero (Solo ventas y cobros en POS)</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">
                            <Mail className="inline h-3 w-3 mr-1" />
                            Email (opcional)
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) =>
                                setFormData({ ...formData, email: e.target.value })
                            }
                            placeholder="usuario@ejemplo.com"
                        />
                        {errors.email && (
                            <p className="text-xs text-destructive">{errors.email}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">
                            <Key className="inline h-3 w-3 mr-1" />
                            Contraseña {!user && '*'}
                        </Label>
                        <Input
                            id="password"
                            type="password"
                            value={formData.password}
                            onChange={(e) =>
                                setFormData({ ...formData, password: e.target.value })
                            }
                            placeholder={user ? 'Dejar en blanco para mantener' : '••••••••'}
                        />
                        {errors.password && (
                            <p className="text-xs text-destructive">{errors.password}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                            Mínimo 6 caracteres
                        </p>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {user ? 'Guardar Cambios' : 'Crear Usuario'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default function UsersManagementPage() {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [toggleUser, setToggleUser] = useState<User | null>(null);

    const queryClient = useQueryClient();
    const currentUser = useAuthStore((state) => state.user);

    // Obtener usuarios
    const { data: users, isLoading } = useQuery({
        queryKey: ['users'],
        queryFn: usersApi.getAll,
    });

    // Mutation para toggle status
    const toggleMutation = useMutation({
        mutationFn: usersApi.toggleStatus,
        onSuccess: (updatedUser) => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success(
                updatedUser.isActive
                    ? `Usuario ${updatedUser.username} activado`
                    : `Usuario ${updatedUser.username} desactivado`
            );
            setToggleUser(null);
        },
        onError: (error: unknown) => {
            const axiosError = error as { response?: { data?: { message?: string } } };
            const message = axiosError.response?.data?.message || 'Error al cambiar el estado del usuario';
            toast.error(message);
        },
    });

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setIsFormOpen(true);
    };

    const handleNewUser = () => {
        setEditingUser(null);
        setIsFormOpen(true);
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex justify-center">
            <div className="w-full max-w-4xl space-y-6 py-4">
                {/* Header con gradiente */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-background border p-6">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />

                    <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link to="/settings">
                                <Button variant="ghost" size="icon" className="hover:bg-purple-500/10">
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                            </Link>
                            <div className="h-12 w-12 rounded-xl bg-purple-500/15 flex items-center justify-center shadow-lg shadow-purple-500/10">
                                <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                    Usuarios del Sistema
                                </h1>
                                <p className="text-muted-foreground text-sm">
                                    Gestiona los usuarios que pueden acceder al sistema
                                </p>
                            </div>
                        </div>
                        <Button onClick={handleNewUser} className="shadow-lg shadow-primary/20">
                            <Plus className="mr-2 h-4 w-4" />
                            Nuevo Usuario
                        </Button>
                    </div>
                </div>

                {/* Tabla de usuarios */}
                <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="font-semibold">Usuario</TableHead>
                                <TableHead className="font-semibold">Nombre Completo</TableHead>
                                <TableHead className="font-semibold">Rol</TableHead>
                                <TableHead className="font-semibold">Email</TableHead>
                                <TableHead className="font-semibold">Estado</TableHead>
                                <TableHead className="font-semibold">Último Acceso</TableHead>
                                <TableHead className="text-right font-semibold">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users?.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                                        <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                        No hay usuarios registrados
                                    </TableCell>
                                </TableRow>
                            )}
                            {users?.map((user) => (
                                <TableRow key={user.id} className={user.isActive ? 'hover:bg-muted/30' : 'opacity-50 bg-muted/20'}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-purple-500/20 to-purple-600/10 flex items-center justify-center text-purple-700 dark:text-purple-300 text-sm font-semibold">
                                                {user.firstName[0]}
                                                {user.lastName[0]}
                                            </div>
                                            <span className="font-mono text-sm">{user.username}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {user.firstName} {user.lastName}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="outline"
                                            className={
                                                user.role === 'cashier'
                                                    ? 'bg-blue-500/10 text-blue-600 border-blue-300 dark:border-blue-700'
                                                    : user.role === 'manager'
                                                        ? 'bg-purple-500/10 text-purple-600 border-purple-300 dark:border-purple-700'
                                                        : 'bg-amber-500/10 text-amber-700 border-amber-300 dark:border-amber-700'
                                            }
                                        >
                                            {user.role === 'cashier' ? 'Cajero' : user.role === 'manager' ? 'Encargado' : 'Administrador'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {user.email ? (
                                            <span className="text-sm">{user.email}</span>
                                        ) : (
                                            <span className="text-muted-foreground text-sm">Sin email</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {user.isActive ? (
                                            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-300 dark:border-green-700">
                                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                                Activo
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-300 dark:border-red-700">
                                                <XCircle className="mr-1 h-3 w-3" />
                                                Inactivo
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {formatDate(user.lastLogin)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleEdit(user)}
                                                title="Editar"
                                                className="h-8 w-8"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setToggleUser(user)}
                                                disabled={user.id === currentUser?.id && user.isActive}
                                                title={
                                                    user.id === currentUser?.id && user.isActive
                                                        ? 'No puedes desactivar tu propia cuenta'
                                                        : user.isActive 
                                                            ? 'Desactivar' 
                                                            : 'Activar'
                                                }
                                                className={`h-8 w-8 ${
                                                    user.id === currentUser?.id && user.isActive
                                                        ? 'text-muted-foreground cursor-not-allowed opacity-50'
                                                        : user.isActive
                                                            ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-100 dark:hover:bg-orange-950'
                                                            : 'text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-950'
                                                }`}
                                            >
                                                {user.isActive ? (
                                                    <ShieldOff className="h-4 w-4" />
                                                ) : (
                                                    <ShieldCheck className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {/* Nota informativa */}
                <div className="rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/20 p-4 border border-amber-200/50 dark:border-amber-900/50">
                    <div className="flex items-start gap-3 text-sm">
                        <ShieldOff className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium text-amber-800 dark:text-amber-300">
                                Política de usuarios
                            </p>
                            <p className="text-muted-foreground mt-1">
                                Los usuarios no pueden ser eliminados del sistema.
                                Si un usuario ya no debe acceder, puedes desactivarlo.
                                Un usuario desactivado no podrá iniciar sesión.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Formulario de usuario */}
                <UserFormDialog
                    open={isFormOpen}
                    onClose={() => {
                        setIsFormOpen(false);
                        setEditingUser(null);
                    }}
                    user={editingUser}
                    onSuccess={() => {
                        setIsFormOpen(false);
                        setEditingUser(null);
                    }}
                />

                {/* Confirmación de toggle status */}
                <AlertDialog open={!!toggleUser} onOpenChange={() => setToggleUser(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                                {toggleUser?.isActive ? (
                                    <ShieldOff className="h-5 w-5 text-orange-600" />
                                ) : (
                                    <ShieldCheck className="h-5 w-5 text-green-600" />
                                )}
                                {toggleUser?.isActive ? '¿Desactivar usuario?' : '¿Activar usuario?'}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                {toggleUser?.isActive
                                    ? `El usuario "${toggleUser?.username}" no podrá acceder al sistema mientras esté desactivado.`
                                    : `El usuario "${toggleUser?.username}" podrá volver a acceder al sistema.`}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => toggleUser && toggleMutation.mutate(toggleUser.id)}
                                className={toggleUser?.isActive
                                    ? 'bg-orange-600 hover:bg-orange-700'
                                    : 'bg-green-600 hover:bg-green-700'
                                }
                            >
                                {toggleMutation.isPending && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                {toggleUser?.isActive ? 'Desactivar' : 'Activar'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
}
