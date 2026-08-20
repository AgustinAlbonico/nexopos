// Stub temporal para desbloquear Vite: el componente real
// (ProductVariantMatrixGrid) estaba en working tree pero no commiteado ni
// presente en disco. Mantiene la firma usada por ProductForm para que la
// página de productos y el modal de venta carguen. La matriz real se
// reconstruirá por separado.
type Props = {
    readonly styleCode?: string;
    readonly defaultPrice?: number;
    readonly defaultCost?: number;
    readonly defaultProfitMargin?: number;
    readonly onMatrixChange?: (cells: unknown[]) => void;
};

export function ProductVariantMatrixGrid(_props: Props): null {
    return null;
}
