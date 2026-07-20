import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { QueryClient } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Select from '@radix-ui/react-select';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { ShoppingCart, Users } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import packageJson from '../package.json';
import tsconfig from '../tsconfig.json';
import App from './App';
import { DashboardPage } from './pages/DashboardPage';
import ProductsPage from './pages/products/ProductsPage';
import { useAuthStore } from './stores/auth.store';
import { formatCurrency } from './lib/utils';

const currentDir = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(currentDir, '..');
const appSource = readFileSync(resolve(currentDir, 'App.tsx'), 'utf-8');
const viteConfigSource = readFileSync(resolve(frontendRoot, 'vite.config.ts'), 'utf-8');

const protectedRoutePaths = [
  'dashboard',
  'products',
  'customers',
  'suppliers',
  'purchases',
  'sales',
  'expenses',
  'incomes',
  'cash-register',
  'customer-accounts',
  'customer-accounts/:customerId',
  'reports',
  'settings',
  'settings/fiscal',
  'settings/users',
  'settings/backup',
] as const;

describe('Smoke Tests - Frontend Build', () => {
  describe('Aplicación y rutas actuales', () => {
    it('debe exponer el componente App principal', () => {
      expect(typeof App).toBe('function');
    });

    it('debe usar HashRouter para compatibilidad con Electron', () => {
      expect(HashRouter).toBeDefined();
      expect(appSource).toContain("import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'");
      expect(appSource).toContain('<HashRouter>');
    });

    it('debe declarar las rutas protegidas actuales', () => {
      expect(Routes).toBeDefined();
      expect(Route).toBeDefined();

      for (const routePath of protectedRoutePaths) {
        expect(appSource).toContain(`path="${routePath}"`);
      }
    });

    it('debe redirigir raíz y rutas desconocidas al dashboard actual', () => {
      expect(appSource).toContain('to="/dashboard"');
      expect(appSource).toContain('path="*"');
    });
  });

  describe('Páginas y estado crítico', () => {
    it('debe poder importar DashboardPage desde la ubicación actual', () => {
      expect(typeof DashboardPage).toBe('function');
    });

    it('debe poder importar ProductsPage desde la ubicación actual', () => {
      expect(typeof ProductsPage).toBe('function');
    });

    it('debe exponer useAuthStore con el contrato actual de sesión', () => {
      const authState = useAuthStore.getState();

      expect(typeof useAuthStore).toBe('function');
      expect(authState).toMatchObject({
        user: null,
        isAuthenticated: false,
      });
      expect(typeof authState.setAuth).toBe('function');
      expect(typeof authState.setUser).toBe('function');
      expect(typeof authState.logout).toBe('function');
    });
  });

  describe('Librerías base de UI y datos', () => {
    it('debe tener TanStack Query disponible para data fetching', () => {
      expect(typeof QueryClient).toBe('function');
    });

    it('debe poder importar componentes base de Radix UI', () => {
      expect(Dialog.Root).toBeDefined();
      expect(DropdownMenu.Root).toBeDefined();
      expect(Select.Root).toBeDefined();
    });

    it('debe tener iconos críticos disponibles desde lucide-react', () => {
      expect(ShoppingCart).toBeDefined();
      expect(Users).toBeDefined();
    });
  });

  describe('Utilidades compartidas', () => {
    it('debe formatear moneda argentina desde lib/utils', () => {
      const formatted = formatCurrency(1234);

      expect(formatted).toContain('$');
      expect(formatted).toContain('1.234');
    });
  });
});

describe('Smoke Tests - Configuración de Build', () => {
  it('package.json debe tener el script de build de Vite', () => {
    expect(packageJson.name).toBe('@sistema/frontend');
    expect(packageJson.scripts.build).toBe('vite build');
  });

  it('vite.config debe apuntar al root y alias actuales del frontend', () => {
    expect(viteConfigSource).toContain("base: './'");
    expect(viteConfigSource).toContain("'@': path.resolve(__dirname, './src')");
    expect(viteConfigSource).toContain("outDir: '../desktop/dist/renderer'");
    expect(viteConfigSource).toContain('port: 5173');
  });

  it('tsconfig debe incluir src y resolver alias @ desde el root frontend', () => {
    expect(tsconfig.include).toEqual(['src']);
    expect(tsconfig.compilerOptions.baseUrl).toBe('.');
    expect(tsconfig.compilerOptions.paths).toEqual({
      '@/*': ['./src/*'],
    });
    expect(tsconfig.compilerOptions.strict).toBe(true);
  });
});

describe('Smoke Tests - Variables de Entorno', () => {
  it('debe resolver una URL de API usable', () => {
    const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

    expect(apiUrl).toMatch(/^https?:\/\//);
  });
});
