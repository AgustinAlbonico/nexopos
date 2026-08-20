import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '../stores/auth.store';
import { useCapabilities } from '../hooks/useCapabilities';
import { useSystemStatus } from '../hooks/useSystemStatus';
import { SystemBlockedScreen } from './SystemBlockedScreen';

interface ProtectedRouteProps {
    readonly children: React.ReactNode;
    readonly requiredCapability?: string;
    readonly requiredRoles?: ('admin' | 'manager' | 'cashier')[];
}

export function ProtectedRoute({ children, requiredCapability, requiredRoles }: ProtectedRouteProps) {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const user = useAuthStore((state) => state.user);
    const userRole = user?.role || 'admin';
    const hasRole = !requiredRoles || requiredRoles.includes(userRole as any);

    const { isEnabled, isLoading } = useSystemStatus();
    const capabilityQuery = useCapabilities(isAuthenticated && requiredCapability !== undefined);
    const hasCapability = requiredCapability === undefined
        || capabilityQuery.data?.appRoutes.enabled.includes(requiredCapability) === true;

    useEffect(() => {
        if (isAuthenticated && !isLoading && isEnabled && requiredCapability && !capabilityQuery.isLoading && !hasCapability) {
            toast.error('Esta sección no está disponible para el perfil activo');
        } else if (isAuthenticated && !hasRole) {
            toast.error('No tenés permisos para acceder a esta sección');
        }
    }, [capabilityQuery.isLoading, hasCapability, hasRole, isAuthenticated, isEnabled, isLoading, requiredCapability]);

    // Si no está autenticado, redirigir al login
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (!hasRole) {
        return <Navigate to={userRole === 'cashier' ? '/sales' : '/dashboard'} replace />;
    }

    // Mientras carga, mostrar nada (la app ya tiene su loading)
    if (isLoading) {
        return null;
    }

    // Si el sistema está deshabilitado, mostrar pantalla de bloqueo
    if (!isEnabled) {
        return <SystemBlockedScreen />;
    }

    if (requiredCapability && capabilityQuery.isLoading) {
        return null;
    }

    if (!hasCapability) {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
}

