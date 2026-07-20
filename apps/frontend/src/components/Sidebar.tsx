/**
 * Sidebar de navegación principal
 * Incluye logo, menú de navegación y perfil de usuario
 * Soporta modo colapsado para maximizar espacio de trabajo
 */
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import {
    LayoutDashboard,
    UserCircle,
    Settings,
    LogOut,
    Package,
    ShoppingCart,
    Receipt,
    Truck,
    Wallet,
    Building2,
    CreditCard,
    BarChart3,
    TrendingUp,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { Button } from './ui/button';
import { useLowStockCount } from '@/features/products/hooks/useLowStock';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from './ui/tooltip';
// Importar imagen correctamente para Vite
import logoNexopos from '../assets/logo-nexopos.png';

interface SidebarProps {
    readonly user: any;
    readonly onLogout: () => void;
    readonly collapsed?: boolean;
    readonly onToggle?: () => void;
    readonly hideToggle?: boolean;
}

interface NavItem {
    title: string;
    href: string;
    icon: React.ElementType;
    badgeKey?: 'lowStock'; // Claves para badges dinámicos
    shortcut?: string; // Atajo de teclado (ej: 'F1')
}

const navItems: NavItem[] = [
    {
        title: 'Inicio',
        href: '/dashboard',
        icon: LayoutDashboard,
        shortcut: 'F1',
    },
    {
        title: 'Ventas',
        href: '/sales',
        icon: ShoppingCart,
        shortcut: 'F2', // Navega + abre modal nueva venta
    },
    {
        title: 'Caja',
        href: '/cash-register',
        icon: Wallet,
        shortcut: 'F3',
    },
    {
        title: 'Cuentas Corrientes',
        href: '/customer-accounts',
        icon: CreditCard,
        shortcut: 'F4',
    },
    {
        title: 'Ingresos',
        href: '/incomes',
        icon: TrendingUp,
        shortcut: 'F5', // Navega + abre modal nuevo ingreso
    },
    {
        title: 'Compras',
        href: '/purchases',
        icon: Truck,
        shortcut: 'F6', // Navega + abre modal nueva compra
    },
    {
        title: 'Gastos',
        href: '/expenses',
        icon: Receipt,
        shortcut: 'F7', // Navega + abre modal nuevo gasto
    },
    {
        title: 'Productos',
        href: '/products',
        icon: Package,
        badgeKey: 'lowStock',
        shortcut: 'F8',
    },
    {
        title: 'Clientes',
        href: '/customers',
        icon: UserCircle,
        shortcut: 'F9',
    },
    {
        title: 'Proveedores',
        href: '/suppliers',
        icon: Building2,
        shortcut: 'F10',
    },
    {
        title: 'Reportes',
        href: '/reports',
        icon: BarChart3,
        shortcut: 'F11',
    },
    {
        title: 'Configuración',
        href: '/settings',
        icon: Settings,
    },
];

export function Sidebar({ user, onLogout, collapsed = false, onToggle, hideToggle = false }: SidebarProps) {
    const location = useLocation();
    const { count: lowStockCount } = useLowStockCount();
    const [version, setVersion] = useState<string>('');

    useEffect(() => {
        const electronAPI = (globalThis as unknown as { electronAPI?: { getAppVersion?: () => Promise<string> } }).electronAPI;
        if (electronAPI?.getAppVersion) {
            electronAPI.getAppVersion()
                .then((v) => setVersion(v))
                .catch((err) => console.error('Error getting app version', err));
        }
    }, []);

    // Mapa de badges dinámicos
    const badges: Record<string, number> = {
        lowStock: lowStockCount,
    };

    return (
        <TooltipProvider delayDuration={0}>
            <div
                className={cn(
                    "flex flex-col h-full bg-card border-r border-border transition-all duration-300 relative",
                    collapsed ? "w-14 xl:w-16" : "w-48 xl:w-56 wide:w-64"
                )}
            >
                {/* Botón de toggle - solo visible cuando no está auto-colapsado */}
                {!hideToggle && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onToggle}
                        className="absolute -right-3 top-7 z-50 h-6 w-6 rounded-full border border-border bg-card shadow-sm hover:bg-accent"
                    >
                        {collapsed ? (
                            <ChevronRight className="h-3 w-3" />
                        ) : (
                            <ChevronLeft className="h-3 w-3" />
                        )}
                    </Button>
                )}

                {/* Header / Logo */}
                <div className={cn("p-4 xl:p-6 border-b border-border", collapsed && "px-2 xl:px-3 py-3 xl:py-4")}>
                    <Link to="/dashboard" className="flex items-center justify-center gap-3 ">
                        {collapsed ? (
                            <div className="h-8 w-8 xl:h-9 xl:w-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-base xl:text-lg shadow-md shadow-primary/25 flex-shrink-0">
                                NP
                            </div>
                        ) : (
                            <img
                                src={logoNexopos}
                                alt="NexoPOS"
                                className="h-8 xl:h-10 w-auto"
                            />
                        )}
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-3 xl:py-4 px-2 xl:px-3">
                    <div className="space-y-1">
                        {navItems.map((item) => {
                            const isActive = location.pathname === item.href;
                            const Icon = item.icon;
                            const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0;

                            const linkContent = (
                                <Link
                                    key={item.href}
                                    to={item.href}
                                    className={cn(
                                        'group flex items-center gap-2 xl:gap-3 px-2 xl:px-3 py-2 xl:py-2.5 rounded-lg text-xs xl:text-sm font-medium transition-all duration-150',
                                        isActive
                                            ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
                                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                                        collapsed && 'justify-center px-2'
                                    )}
                                >
                                    <Icon
                                        className={cn(
                                            'h-4 w-4 xl:h-5 xl:w-5 transition-colors flex-shrink-0',
                                            isActive
                                                ? 'text-primary-foreground'
                                                : 'text-muted-foreground group-hover:text-accent-foreground'
                                        )}
                                    />
                                    {!collapsed && (
                                        <>
                                            <span className="flex-1">{item.title}</span>
                                            {item.shortcut && (
                                                <kbd className="pointer-events-none flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-bold text-foreground opacity-100 shadow-sm ml-auto">
                                                    {item.shortcut}
                                                </kbd>
                                            )}
                                            {badgeCount > 0 ? (
                                                <span
                                                    className={cn(
                                                        'flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold',
                                                        isActive
                                                            ? 'bg-primary-foreground/20 text-primary-foreground'
                                                            : 'bg-destructive text-destructive-foreground'
                                                    )}
                                                >
                                                    {badgeCount > 99 ? '99+' : badgeCount}
                                                </span>
                                            ) : null}
                                        </>
                                    )}
                                    {collapsed && badgeCount > 0 && (
                                        <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-destructive" />
                                    )}
                                </Link>
                            );

                            // En modo colapsado, envolver con tooltip
                            if (collapsed) {
                                return (
                                    <Tooltip key={item.href}>
                                        <TooltipTrigger asChild>
                                            <div className="relative">
                                                {linkContent}
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="right" className="flex items-center gap-2">
                                            {item.title}
                                            {badgeCount > 0 && (
                                                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-semibold text-destructive-foreground">
                                                    {badgeCount > 99 ? '99+' : badgeCount}
                                                </span>
                                            )}
                                        </TooltipContent>
                                    </Tooltip>
                                );
                            }

                            return linkContent;
                        })}
                    </div>
                </nav>

                {/* User Profile & Logout */}
                <div className={cn("p-3 xl:p-4 border-t border-border bg-muted/30", collapsed && "px-2")}>
                    {collapsed ? (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    onClick={onLogout}
                                >
                                    <LogOut className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                                Cerrar Sesión
                            </TooltipContent>
                        </Tooltip>
                    ) : (
                        <>
                            <div className="flex items-center gap-2 xl:gap-3 mb-2 xl:mb-3 px-1">
                                <div className="h-8 w-8 xl:h-10 xl:w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs xl:text-sm flex-shrink-0">
                                    {user?.firstName?.[0]}
                                    {user?.lastName?.[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs xl:text-sm font-medium text-foreground truncate">
                                        {user?.firstName} {user?.lastName}
                                    </p>
                                    <p className="text-[10px] xl:text-xs text-muted-foreground truncate">
                                        {user?.username}
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 xl:h-9 text-xs xl:text-sm"
                                onClick={onLogout}
                            >
                                <LogOut className="mr-2 h-3 w-3 xl:h-4 xl:w-4" />
                                Cerrar Sesión
                            </Button>
                            {version && (
                                <p className="text-[10px] text-muted-foreground/50 text-center mt-2 font-mono">
                                    v{version}
                                </p>
                            )}
                        </>
                    )}
                </div>
            </div>
        </TooltipProvider >
    );
}
