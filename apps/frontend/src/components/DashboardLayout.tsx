import { useEffect, useState, Suspense } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { authService } from '../services/auth.service';
import { useAuthStore } from '../stores/auth.store';
import { Sidebar } from './Sidebar';
import { WindowControls } from './WindowControls';
import { Loader2 } from 'lucide-react';
import { useRouteRefresh } from '@/hooks/useRouteRefresh';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { isElectron } from '@/lib/utils';

export function DashboardLayout() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user, setUser, logout } = useAuthStore();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const isBelowXl = useMediaQuery('(max-width: 1279px)');
    const effectiveCollapsed = sidebarCollapsed || isBelowXl;

    // Forzar refetch de datos al navegar entre rutas del sidebar
    useRouteRefresh();

    // Obtener perfil del usuario al montar el componente
    const { data: profile } = useQuery({
        queryKey: ['profile'],
        queryFn: authService.getProfile,
        retry: false,
        staleTime: 0, // Siempre considerar los datos como stale
    });

    useEffect(() => {
        if (profile) {
            setUser(profile);
        }
    }, [profile, setUser]);

    const handleLogout = async () => {
        try {
            await authService.logout();
            // Limpiar el cache de React Query para que al hacer login con otro usuario se cargue su perfil
            queryClient.clear();
            logout();
            toast.success('Sesión cerrada correctamente');
            navigate('/login', { replace: true });
        } catch {
            // Incluso si falla en el servidor, cerramos sesión localmente
            queryClient.clear();
            logout();
            navigate('/login', { replace: true });
        }
    };

    const toggleSidebar = () => {
        setSidebarCollapsed(!sidebarCollapsed);
    };

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            {/* Sidebar */}
            <Sidebar
                user={user}
                onLogout={handleLogout}
                collapsed={effectiveCollapsed}
                onToggle={toggleSidebar}
                hideToggle={isBelowXl}
            />

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {isElectron() && (
                    <div
                        className="h-12 shrink-0 flex items-center justify-between px-3 border-b border-border/40 bg-background/80 backdrop-blur-sm"
                        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
                    >
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground select-none">
                            NexoPOS
                        </div>
                        <WindowControls className="flex items-center gap-1" />
                    </div>
                )}
                <main className="flex-1 overflow-y-auto p-4 xl:p-6 wide:p-8">
                    <div className="mx-auto w-full max-w-full wide:max-w-7xl 2xl:max-w-[1600px]">
                        <Suspense fallback={
                            <div className="flex h-full w-full items-center justify-center p-12">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        }>
                            <Outlet />
                        </Suspense>
                    </div>
                </main>
            </div>
        </div>
    );
}
