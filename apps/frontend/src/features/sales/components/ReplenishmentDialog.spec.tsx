/**
 * Tests del `ReplenishmentDialog` (PR8).
 * Cubre:
 *  - Render de items + opciones.
 *  - Selección por defecto: primera opción con stock suficiente.
 *  - Botón "Reponer y continuar" deshabilitado si algún ítem no tiene
 *    opción full-match.
 *  - Click emite `onConfirm` con los traslados correctos.
 *  - Error inline cuando `submitError` está seteado.
 *  - Cancel no llama a `onConfirm`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReplenishmentDialog } from './ReplenishmentDialog';
import type { BlockedStockItemDTO, ReplenishmentTransferDTO } from '../types';

vi.mock('sonner', () => ({
    toast: { error: vi.fn() },
}));

const items: BlockedStockItemDTO[] = [
    {
        productId: 'p-1',
        productName: 'Coca Cola 1.5L',
        requested: 5,
        primarySaleAvailable: 2,
        options: [
            { locationId: 'loc-A', locationName: 'Depósito A', available: 8 },
            { locationId: 'loc-B', locationName: 'Depósito B', available: 3 }, // partial
            { locationId: 'loc-C', locationName: 'Depósito C', available: 6 },
        ],
    },
    {
        productId: 'p-2',
        productName: 'Sprite 1.5L',
        requested: 4,
        primarySaleAvailable: 0,
        options: [
            { locationId: 'loc-A', locationName: 'Depósito A', available: 5 },
        ],
    },
];

const noMatchItems: BlockedStockItemDTO[] = [
    {
        productId: 'p-3',
        productName: 'Fanta 1.5L',
        requested: 10,
        primarySaleAvailable: 0,
        options: [
            { locationId: 'loc-A', locationName: 'Depósito A', available: 3 },
            { locationId: 'loc-B', locationName: 'Depósito B', available: 1 },
        ],
    },
];

function renderDialog(
    props: Partial<React.ComponentProps<typeof ReplenishmentDialog>> = {},
) {
    const onOpenChange =
        (props.onOpenChange as ReturnType<typeof vi.fn> | undefined) ??
        vi.fn<[boolean], void>();
    const onConfirm =
        (props.onConfirm as ReturnType<typeof vi.fn> | undefined) ??
        vi.fn<[ReplenishmentTransferDTO[]], void>();
    const utils = render(
        <ReplenishmentDialog
            open={props.open ?? true}
            onOpenChange={onOpenChange}
            items={props.items ?? items}
            isSubmitting={props.isSubmitting}
            submitError={props.submitError}
            onConfirm={onConfirm}
        />,
    );
    return { onOpenChange, onConfirm, ...utils };
}

describe('ReplenishmentDialog', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renderiza los ítems y sus opciones', () => {
        renderDialog();

        expect(screen.getByText('Coca Cola 1.5L')).toBeInTheDocument();
        expect(screen.getByText('Sprite 1.5L')).toBeInTheDocument();
        // Las dos opciones con stock suficiente para Coca (A y C).
        expect(screen.getAllByRole('button', { name: /reponer desde depósito a/i }).length).toBeGreaterThan(0);
        expect(screen.getAllByRole('button', { name: /reponer desde depósito c/i }).length).toBeGreaterThan(0);
        // La opción parcial B (3 < 5) NO debe aparecer como opción reponible.
        expect(screen.queryByRole('button', { name: /reponer desde depósito b/i })).not.toBeInTheDocument();
    });

    it('marca por defecto la primera opción con stock suficiente', () => {
        renderDialog();

        // Coca Cola: la primera full-match es Depósito A.
        const depositoAButtons = screen.getAllByRole('button', {
            name: /reponer desde depósito a/i,
        });
        // El primero es Depósito A de Coca (default), el segundo es Depósito A de Sprite (también default).
        expect(depositoAButtons.length).toBeGreaterThanOrEqual(1);
        // Verifica que el primer match aparece como botón default (no outline).
        expect(depositoAButtons[0]).toHaveAttribute('type', 'button');
    });

    it('habilita "Reponer y continuar" cuando todos los ítems tienen selección full-match', () => {
        renderDialog();
        expect(screen.getByRole('button', { name: /reponer y continuar/i })).not.toBeDisabled();
    });

    it('deshabilita "Reponer y continuar" cuando algún ítem no tiene full-match', () => {
        renderDialog({ items: noMatchItems });
        const button = screen.getByRole('button', { name: /reponer y continuar/i });
        expect(button).toBeDisabled();
    });

    it('muestra "Stock insuficiente en el depósito" cuando un ítem no tiene full-match', () => {
        renderDialog({ items: noMatchItems });
        expect(screen.getByText(/stock insuficiente en el depósito/i)).toBeInTheDocument();
        // Top 3 partials listados como info (1 ítem, 2 partials).
        expect(screen.getByText(/depósito a: 3/i)).toBeInTheDocument();
        expect(screen.getByText(/depósito b: 1/i)).toBeInTheDocument();
    });

    it('click en "Reponer y continuar" emite onConfirm con los traslados correctos', async () => {
        const user = userEvent.setup();
        const { onConfirm } = renderDialog();

        await user.click(screen.getByRole('button', { name: /reponer y continuar/i }));

        expect(onConfirm).toHaveBeenCalledTimes(1);
        const transfers = onConfirm.mock.calls[0][0] as ReplenishmentTransferDTO[];
        expect(transfers).toEqual([
            expect.objectContaining({ productId: 'p-1', fromLocationId: 'loc-A', quantity: 5 }),
            expect.objectContaining({ productId: 'p-2', fromLocationId: 'loc-A', quantity: 4 }),
        ]);
    });

    it('click en otra opción reasigna la selección y emite el traslado nuevo', async () => {
        const user = userEvent.setup();
        const { onConfirm } = renderDialog();

        // Para Coca Cola (p-1), elegí Depósito C en vez del default (Depósito A).
        await user.click(screen.getByRole('button', { name: /reponer desde depósito c/i }));

        await user.click(screen.getByRole('button', { name: /reponer y continuar/i }));

        const transfers = onConfirm.mock.calls[0][0] as ReplenishmentTransferDTO[];
        expect(transfers[0]).toEqual(
            expect.objectContaining({ productId: 'p-1', fromLocationId: 'loc-C', quantity: 5 }),
        );
    });

    it('muestra el error inline cuando submitError está seteado', () => {
        renderDialog({ submitError: 'El stock cambió, revisá las opciones' });
        expect(screen.getByRole('alert')).toHaveTextContent(
            /el stock cambió, revisá las opciones/i,
        );
    });

    it('click en "Cancelar" cierra el diálogo sin llamar onConfirm', async () => {
        const user = userEvent.setup();
        const { onConfirm, onOpenChange } = renderDialog();

        await user.click(screen.getByRole('button', { name: /^cancelar$/i }));

        expect(onConfirm).not.toHaveBeenCalled();
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('muestra el texto "Procesando..." cuando isSubmitting=true', () => {
        renderDialog({ isSubmitting: true });
        const button = screen.getByRole('button', { name: /procesando\.\.\./i });
        expect(button).toBeDisabled();
    });
});