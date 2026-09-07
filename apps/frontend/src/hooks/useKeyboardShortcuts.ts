import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    useShortcutsStore,
    SHORTCUT_MAP,
    ACTION_ROUTES,
    MODAL_ACTIONS,
    ShortcutAction
} from '../stores/shortcuts.store';
import { useAuthStore } from '../stores/auth.store';

/**
 * Hook global que escucha atajos de teclado y dispara acciones.
 * 
 * Flujo de cada atajo:
 * 1. Si tiene ruta asociada (ACTION_ROUTES), primero navega a esa ruta
 * 2. Si es una acción de modal (MODAL_ACTIONS), espera a llegar y dispara el shortcut
 * 3. Las páginas usan useShortcutAction() para escuchar y abrir sus modales
 * 
 * Mapeo F1-F11:
 * - F1: Dashboard (solo navegación)
 * - F2: Ventas + abrir modal nueva venta
 * - F3: Caja (solo navegación)
 * - F4: Cuentas Corrientes (solo navegación)
 * - F5: Ingresos + abrir modal nuevo ingreso
 * - F6: Compras + abrir modal nueva compra
 * - F7: Gastos + abrir modal nuevo gasto
 * - F8: Productos (solo navegación)
 * - F9: Clientes (solo navegación)
 * - F10: Proveedores (solo navegación)
 * - F11: Reportes (solo navegación)
 * - Ctrl+B: Búsqueda rápida
 * - Escape: Cerrar modal activo
 */
export function useKeyboardShortcuts(): void {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated } = useAuthStore();
    const {
        triggerShortcut,
        clearShortcut,
        toggleSearch,
        closeSearch,
        activeShortcut,
        isSearchOpen
    } = useShortcutsStore();

    /**
     * Verifica si el elemento activo es un input
     */
    const isInputElement = useCallback((target: EventTarget | null): boolean => {
        if (!target) return false;
        const element = target as HTMLElement;
        return (
            element.tagName === 'INPUT' ||
            element.tagName === 'TEXTAREA' ||
            element.isContentEditable
        );
    }, []);

    /**
     * Maneja la tecla Escape para cerrar modales
     */
    const handleEscapeKey = useCallback((event: KeyboardEvent): boolean => {
        if (event.key !== 'Escape') return false;

        if (isSearchOpen) {
            event.preventDefault();
            closeSearch();
            return true;
        }
        if (activeShortcut) {
            event.preventDefault();
            clearShortcut();
            return true;
        }
        return true; // Escape manejado (dejar que cierre otros modales)
    }, [isSearchOpen, activeShortcut, closeSearch, clearShortcut]);

    /**
     * Maneja Ctrl+B para búsqueda rápida
     */
    const handleSearchShortcut = useCallback((event: KeyboardEvent): boolean => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b') {
            event.preventDefault();
            toggleSearch();
            return true;
        }
        return false;
    }, [toggleSearch]);

    /**
     * Maneja teclas de función F1-F11
     */
    const handleFunctionKey = useCallback((event: KeyboardEvent): boolean => {
        // Si hay un diálogo/modal abierto (ej: venta POS), no ejecutar navegación global
        if (document.querySelector('[role="dialog"]')) {
            return false;
        }

        const shortcutAction = SHORTCUT_MAP[event.key] as ShortcutAction | undefined;
        if (!shortcutAction) return false;

        event.preventDefault();

        const targetRoute = ACTION_ROUTES[shortcutAction];
        const isModalAction = MODAL_ACTIONS.includes(shortcutAction);

        // Si ya estamos en la ruta correcta
        if (targetRoute && location.pathname === targetRoute) {
            if (isModalAction) {
                triggerShortcut(shortcutAction);
            }
            return true;
        }

        // Navegar a la ruta si es necesario
        if (targetRoute) {
            navigate(targetRoute);

            // Disparar modal después de navegar
            if (isModalAction) {
                setTimeout(() => triggerShortcut(shortcutAction), 100);
            }
        }

        return true;
    }, [location.pathname, navigate, triggerShortcut]);

    useEffect(() => {
        // No activar atajos si no está autenticado o está en login
        if (!isAuthenticated || location.pathname === '/login') {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            // Si el evento ya fue manejado por un componente hijo (ej: POS SaleForm), no ejecutar atajos globales
            if (event.defaultPrevented) return;

            // Escape siempre funciona
            if (handleEscapeKey(event)) return;

            // No procesar otros atajos si hay input enfocado
            if (isInputElement(event.target)) return;

            // Búsqueda rápida
            if (handleSearchShortcut(event)) return;

            // Teclas de función
            handleFunctionKey(event);
        };

        globalThis.addEventListener('keydown', handleKeyDown);
        return () => globalThis.removeEventListener('keydown', handleKeyDown);
    }, [
        isAuthenticated,
        location.pathname,
        handleEscapeKey,
        handleSearchShortcut,
        handleFunctionKey,
        isInputElement,
    ]);
}

/**
 * Hook para escuchar un atajo específico en un componente.
 * Cuando el atajo se activa, ejecuta el callback y limpia el atajo.
 * 
 * @param shortcut - El atajo a escuchar (ej: 'NEW_SALE')
 * @param callback - Función a ejecutar cuando se activa el atajo
 */
export function useShortcutAction(
    shortcut: ShortcutAction,
    callback: () => void
): void {
    const { activeShortcut, clearShortcut } = useShortcutsStore();

    useEffect(() => {
        if (activeShortcut === shortcut) {
            callback();
            clearShortcut();
        }
    }, [activeShortcut, shortcut, callback, clearShortcut]);
}
