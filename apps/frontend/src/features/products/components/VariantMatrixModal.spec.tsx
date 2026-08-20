import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { VariantMatrixModal } from './VariantMatrixModal';
import type { VariantAttributeOption } from '../types';

// --- Capability mock (control hasVariantsCapability per test) ---
let mockHasVariantsCapability = true;
vi.mock('@/hooks/useCapabilities', () => ({
    useCapabilities: () => ({
        data: {
            profileKey: 'test-profile',
            profileVersion: 1,
            capabilitiesSchemaVersion: 1,
            capabilities: {
                'STRUCTURAL.variants': mockHasVariantsCapability,
            },
            appRoutes: { enabled: [], disabled: [] },
            onboardingCompleted: false,
            selectedBusinessType: null,
        },
        isLoading: false,
        isError: false,
    }),
}));

// --- API mock (in-memory catalog + tracking de llamadas) ---
const SEED_COLORS: VariantAttributeOption[] = [
    { id: 'c-negro', type: 'color', name: 'Negro', colorHex: '#000000', createdAt: '', updatedAt: '' },
    { id: 'c-blanco', type: 'color', name: 'Blanco', colorHex: '#FFFFFF', createdAt: '', updatedAt: '' },
    { id: 'c-azul', type: 'color', name: 'Azul', colorHex: '#1E3A8A', createdAt: '', updatedAt: '' },
    { id: 'c-rojo', type: 'color', name: 'Rojo', colorHex: '#B91C1C', createdAt: '', updatedAt: '' },
    { id: 'c-gris', type: 'color', name: 'Gris', colorHex: '#6B7280', createdAt: '', updatedAt: '' },
    { id: 'c-verde', type: 'color', name: 'Verde', colorHex: '#16A34A', createdAt: '', updatedAt: '' },
    { id: 'c-beige', type: 'color', name: 'Beige', colorHex: '#D4C5A9', createdAt: '', updatedAt: '' },
];

const SEED_SIZES: VariantAttributeOption[] = [
    { id: 's-s', type: 'size', name: 'S', colorHex: null, createdAt: '', updatedAt: '' },
    { id: 's-m', type: 'size', name: 'M', colorHex: null, createdAt: '', updatedAt: '' },
    { id: 's-l', type: 'size', name: 'L', colorHex: null, createdAt: '', updatedAt: '' },
];

let catalogColors: VariantAttributeOption[] = [...SEED_COLORS];
let catalogSizes: VariantAttributeOption[] = [...SEED_SIZES];
let usageCountById: Record<string, number> = {};
let createCalls: { type: string; name: string }[] = [];
let updateCalls: { id: string; name: string; colorHex: string | null }[] = [];
let deleteCalls: string[] = [];

vi.mock('../api/products.api', () => ({
    attributeOptionsApi: {
        getAll: vi.fn(async (type?: 'color' | 'size') => {
            if (type === 'color') return [...catalogColors];
            if (type === 'size') return [...catalogSizes];
            return [];
        }),
        getUsageCount: vi.fn(async (id: string) => ({ usageCount: usageCountById[id] ?? 0 })),
        create: vi.fn(async (data: { type: 'color' | 'size'; name: string; colorHex?: string | null }) => {
            createCalls.push({ type: data.type, name: data.name });
            const created: VariantAttributeOption = {
                id: `new-${data.name.toLowerCase()}`,
                type: data.type,
                name: data.name,
                colorHex: data.colorHex ?? null,
                createdAt: '',
                updatedAt: '',
            };
            if (data.type === 'color') catalogColors = [...catalogColors, created];
            else catalogSizes = [...catalogSizes, created];
            return created;
        }),
        update: vi.fn(async (id: string, data: { name?: string; colorHex?: string | null }) => {
            updateCalls.push({ id, name: data.name ?? '', colorHex: data.colorHex ?? null });
            const list = catalogColors.find((c) => c.id === id) ? catalogColors : catalogSizes;
            const idx = list.findIndex((o) => o.id === id);
            const updated = { ...list[idx], ...data };
            list[idx] = updated;
            return updated;
        }),
        delete: vi.fn(async (id: string) => {
            deleteCalls.push(id);
            const usageCount = usageCountById[id] ?? 0;
            catalogColors = catalogColors.filter((c) => c.id !== id);
            catalogSizes = catalogSizes.filter((s) => s.id !== id);
            return { message: 'ok', usageCount };
        }),
    },
    productsApi: {
        // generateVariants es gap pre-existente — ni lo mockeamos para no propagar la mentira
    },
}));

vi.mock('sonner', () => ({
    toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

function createWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false, gcTime: 0 },
            mutations: { retry: false },
        },
    });
    return function Wrapper({ children }: { children: ReactNode }) {
        return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    };
}

function renderModal(props: Partial<React.ComponentProps<typeof VariantMatrixModal>> = {}) {
    const onClose = props.onClose ?? vi.fn();
    const onSuccess = props.onSuccess ?? vi.fn();
    const utils = render(
        <VariantMatrixModal
            parentProductId="parent-1"
            parentProductName="Remera Lisa"
            open={true}
            onClose={onClose}
            onSuccess={onSuccess}
            {...props}
        />,
        { wrapper: createWrapper() }
    );
    return { ...utils, onClose, onSuccess };
}

beforeEach(() => {
    mockHasVariantsCapability = true;
    catalogColors = [...SEED_COLORS];
    catalogSizes = [...SEED_SIZES];
    usageCountById = {};
    createCalls = [];
    updateCalls = [];
    deleteCalls = [];
});

describe('VariantMatrixModal', () => {
    it('con capability=false no fetchea catálogo ni muestra chips', async () => {
        mockHasVariantsCapability = false;
        renderModal();

        await waitFor(() => {
            expect(screen.getByTestId('capability-blocked')).toBeInTheDocument();
        });
        // No debe haber llamado a getAll del catálogo
        const { attributeOptionsApi } = await import('../api/products.api');
        expect(attributeOptionsApi.getAll).not.toHaveBeenCalled();
        // Tampoco chips selected
        expect(screen.queryByTestId('selected-color')).not.toBeInTheDocument();
        // Botón Generar debe estar disabled
        expect(screen.getByTestId('generate-button')).toBeDisabled();
    });

    it('con capability=true muestra los 7 colores seed del catálogo', async () => {
        renderModal();

        const catalog = await screen.findByTestId('catalog-color');
        await waitFor(() => {
            expect(within(catalog).getByText('Negro')).toBeInTheDocument();
        });
        for (const name of ['Negro', 'Blanco', 'Azul', 'Rojo', 'Gris', 'Verde', 'Beige']) {
            expect(within(catalog).getByText(name)).toBeInTheDocument();
        }
        expect(within(catalog).getAllByTestId(/^catalog-delete-/)).toHaveLength(7);
        expect(within(catalog).getAllByTestId(/^catalog-edit-/)).toHaveLength(7);
    });

    it('alta al vuelo "Camel" + Enter → aparece en chips Y se persiste vía create()', async () => {
        const user = userEvent.setup();
        renderModal();

        // Esperar a que cargue el catálogo
        await screen.findByTestId('catalog-color');

        const input = screen.getByTestId('input-new-color');
        await user.click(input);
        await user.keyboard('Camel');
        await user.keyboard('{Enter}');

        // El chip seleccionado debe aparecer
        await waitFor(() => {
            expect(screen.getByTestId('selected-chip-color-new-camel')).toBeInTheDocument();
        });
        // El catálogo debe contenerlo después del invalidate (catalog query se refetchea)
        const catalog = screen.getByTestId('catalog-color');
        await waitFor(() => {
            expect(within(catalog).getByText('Camel')).toBeInTheDocument();
        });
        // create() del API se llamó una sola vez con type='color', name='Camel'
        expect(createCalls).toEqual([{ type: 'color', name: 'Camel' }]);
    });

    it('dedupe case-insensitive: tipear "azul" cuando ya existe "Azul" NO llama a create()', async () => {
        const user = userEvent.setup();
        renderModal();

        await screen.findByTestId('catalog-color');

        const input = screen.getByTestId('input-new-color');
        await user.click(input);
        await user.keyboard('azul');
        await user.keyboard('{Enter}');

        // El chip del azul existente debe quedar seleccionado (NO se crea duplicado)
        await waitFor(() => {
            expect(screen.getByTestId('selected-chip-color-c-azul')).toBeInTheDocument();
        });
        // create() NO se llamó (azul ya estaba en el catálogo seed)
        expect(createCalls).toEqual([]);
        // El catálogo sigue teniendo solo los 7 colores seed (no se agregó ningún duplicado)
        const catalog = screen.getByTestId('catalog-color');
        const azulMatches = within(catalog).getAllByText(/^Azul$/);
        expect(azulMatches).toHaveLength(1);
    });

    it('delete con usageCount > 0 muestra "N variantes usan este color" en el AlertDialog', async () => {
        const user = userEvent.setup();
        usageCountById = { 'c-azul': 5 };
        renderModal();

        // Esperar a que la fila del Azul esté en el DOM (no solo el contenedor)
        const deleteButton = await screen.findByTestId('catalog-delete-c-azul');
        await user.click(deleteButton);

        // El AlertDialog debe abrirse con el preview de uso
        const dialog = await screen.findByTestId('delete-dialog');
        expect(within(dialog).getByTestId('usage-warning')).toHaveTextContent(
            /5\s*variantes?\s*usan\s*este\s*color/,
        );
        expect(within(dialog).getByText(/Azul/)).toBeInTheDocument();

        // Confirmar el delete
        await user.click(within(dialog).getByTestId('confirm-delete'));

        // delete() del API se llamó
        await waitFor(() => {
            expect(deleteCalls).toEqual(['c-azul']);
        });
    });
});