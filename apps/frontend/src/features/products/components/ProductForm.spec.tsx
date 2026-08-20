import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProductForm } from './ProductForm';
import { categoriesApi } from '../api/products.api';
import { toast } from 'sonner';

vi.mock('../api/products.api', () => ({
    categoriesApi: {
        getActive: vi.fn(() => Promise.resolve([
            { id: 'cat-1', name: 'Bebidas', profitMargin: 30, color: '#ff0000', isActive: true },
        ])),
        create: vi.fn(),
    },
    productsApi: {
        calculatePrice: vi.fn(),
        createMatrix: vi.fn().mockResolvedValue({ parent: { id: 'parent-1', name: 'Remera Lisa' }, variants: [], totalVariants: 12 }),
        getApparelSuggestions: vi.fn().mockResolvedValue({ seasons: ['Primavera-Verano 2026'], collections: ['Línea Urbana'] }),
    },
    brandsApi: {
        search: vi.fn(() => Promise.resolve([])),
    },
}));

vi.mock('@/lib/axios', () => ({
    api: {
        get: vi.fn((url: string) => {
            if (url === '/api/configuration') {
                return Promise.resolve({ data: { defaultProfitMargin: 30 } });
            }
            if (url === '/api/configuration/manifest') {
                return Promise.resolve({
                    data: {
                        profileKey: 'simple-retail',
                        profileVersion: 1,
                        capabilitiesSchemaVersion: 1,
                        capabilities: {},
                        appRoutes: { enabled: [], disabled: [] },
                    },
                });
            }
            return Promise.resolve({ data: {} });
        }),
    },
}));

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

function createWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });

    return function Wrapper({ children }: { children: React.ReactNode }) {
        return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    };
}

describe('ProductForm - Creación rápida de categorías', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renderiza el botón con el ícono más (+) junto al selector de categorías', async () => {
        const wrapper = createWrapper();
        render(<ProductForm onSubmit={vi.fn()} />, { wrapper });

        const addCategoryBtn = screen.getByRole('button', { name: /crear nueva categoría/i });
        expect(addCategoryBtn).toBeInTheDocument();
    });

    it('abre el modal de "Nueva Categoría" al presionar el botón (+)', async () => {
        const user = userEvent.setup();
        const wrapper = createWrapper();
        render(<ProductForm onSubmit={vi.fn()} />, { wrapper });

        const addCategoryBtn = screen.getByRole('button', { name: /crear nueva categoría/i });
        await user.click(addCategoryBtn);

        expect(screen.getByRole('heading', { name: /nueva categoría/i })).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/ej: bebidas, almacén, limpieza/i)).toBeInTheDocument();
    });

    it('permite crear una nueva categoría y la selecciona automáticamente en el formulario', async () => {
        const user = userEvent.setup();
        const newCategory = {
            id: 'cat-new-123',
            name: 'Golosinas',
            profitMargin: 40,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        (categoriesApi.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce(newCategory);

        const wrapper = createWrapper();
        render(<ProductForm onSubmit={vi.fn()} />, { wrapper });

        // Abrir modal con botón (+)
        const addCategoryBtn = screen.getByRole('button', { name: /crear nueva categoría/i });
        await user.click(addCategoryBtn);

        // Completar campos del modal
        const nameInput = screen.getByPlaceholderText(/ej: bebidas, almacén, limpieza/i);
        const marginInput = screen.getByPlaceholderText('Ej: 30');

        await user.type(nameInput, 'Golosinas');
        await user.type(marginInput, '40');

        // Click en Crear Categoría
        const submitBtn = screen.getByRole('button', { name: 'Crear Categoría' });
        await user.click(submitBtn);

        await waitFor(() => {
            expect(categoriesApi.create).toHaveBeenCalledWith({
                name: 'Golosinas',
                profitMargin: 40,
            });
        });

        expect(toast.success).toHaveBeenCalledWith('Categoría "Golosinas" creada');
    });
});

describe('ProductForm - Modo Matriz de Indumentaria y Aislamiento de Capacidades', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('no muestra el selector de modo textil cuando STRUCTURAL.variants no está habilitada', async () => {
        const wrapper = createWrapper();
        render(<ProductForm onSubmit={vi.fn()} />, { wrapper });

        expect(screen.queryByText('Modo de Carga Textil')).not.toBeInTheDocument();
        expect(screen.queryByText('Matriz de Talles y Colores')).not.toBeInTheDocument();
    });

    it('muestra el selector de modo textil y conmuta a la grilla 2D cuando la capacidad está activa', async () => {
        const { api } = await import('@/lib/axios');
        (api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
            if (url === '/api/configuration/manifest') {
                return Promise.resolve({
                    data: {
                        profileKey: 'apparel',
                        profileVersion: 1,
                        capabilitiesSchemaVersion: 1,
                        capabilities: { 'STRUCTURAL.variants': true },
                        appRoutes: { enabled: [], disabled: [] },
                    },
                });
            }
            if (url === '/api/configuration') {
                return Promise.resolve({ data: { defaultProfitMargin: 30 } });
            }
            return Promise.resolve({ data: {} });
        });

        const user = userEvent.setup();
        const wrapper = createWrapper();
        render(<ProductForm onSubmit={vi.fn()} />, { wrapper });

        await waitFor(() => {
            expect(screen.getByText('Modo de Carga Textil')).toBeInTheDocument();
        });

        const matrixToggleBtn = screen.getByText('Matriz de Talles y Colores');
        await user.click(matrixToggleBtn);

        // En modo matriz, debe aparecer el input de código de estilo y la grilla 2D
        expect(screen.getByPlaceholderText(/ej: rem-100/i)).toBeInTheDocument();
        expect(screen.getByText('1. Curva de Talles (Columnas)')).toBeInTheDocument();
        expect(screen.getByText('2. Paleta de Colores (Filas)')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /guardar modelo y generar variantes/i })).toBeInTheDocument();
    });
});
