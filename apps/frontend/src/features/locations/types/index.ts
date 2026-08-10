/**
 * Tipos del feature de ubicaciones (PR7 — stock sectorizado).
 * El shape replica la entidad `Location` del backend.
 */
export enum LocationFunction {
    SALE = 'SALE',
    STORAGE = 'STORAGE',
}

export interface Location {
    id: string;
    name: string;
    function: LocationFunction;
    isActive: boolean;
    isPrimarySale: boolean;
    isDefaultReceive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateLocationDTO {
    name: string;
    function: LocationFunction;
    isPrimarySale?: boolean;
    isDefaultReceive?: boolean;
}

export interface UpdateLocationDTO {
    name?: string;
    function?: LocationFunction;
    isPrimarySale?: boolean;
    isDefaultReceive?: boolean;
}

/**
 * Input del wizard de activación (POST /api/inventory/activate).
 * El backend exige exactamente una primaria y un destino.
 */
export interface ActivateStockSectorizadoDTO {
    locations: CreateLocationDTO[];
    initialStockLocationName: string;
}

export interface ActivationResult {
    ok: true;
    products: number;
    locations: number;
}

/** Campos del modo sectorizado en `SystemConfiguration`. */
export interface SystemConfiguration {
    id: string;
    defaultProfitMargin: number;
    minStockAlert: number;
    barcodeScannerEnabled: boolean;
    barcodeScannerTimeoutMs: number;
    allowOutOfStockSale: boolean;
    stockSectorizado: boolean;
    primarySaleLocationId: string | null;
    defaultReceiveLocationId: string | null;
    stockMinimoVenta: number;
    createdAt: string;
    updatedAt: string;
}

export const FUNCTION_LABEL: Record<LocationFunction, string> = {
    [LocationFunction.SALE]: 'Venta',
    [LocationFunction.STORAGE]: 'Depósito',
};

/**
 * Tipos para alertas de stock separadas (PR9 — `GET /api/inventory/stock-alerts`).
 * `purchaseAlerts`: productos a comprar (total <= minStockAlert).
 * `replenishmentAlerts`: productos a reponer del depósito al salón
 *   (stock en primaria <= stockMinimoVenta, hay stock alternativo).
 */
export interface PurchaseAlertDTO {
    productId: string;
    productName: string;
    currentStock: number;
    minimum: number;
}

export interface ReplenishmentAlertDTO {
    productId: string;
    productName: string;
    currentLocationStock: number;
    minimum: number;
    suggestedSourceLocationId: string | null;
    suggestedQuantity: number;
    reserveStock: number;
}

export interface StockAlertsDTO {
    purchaseAlerts: PurchaseAlertDTO[];
    replenishmentAlerts: ReplenishmentAlertDTO[];
}

/**
 * DTO para `POST /api/inventory/transfers` (PR9). Wrap del método interno
 * `InventoryService.transfer` para que la UI proactiva pueda crear
 * traslados sin pasar por el flujo POS.
 */
export interface CreateStockTransferDTO {
    productId: string;
    fromLocationId: string;
    toLocationId: string;
    quantity: number;
    reason?: string;
}

export interface StockTransferDTO {
    id: string;
    productId: string;
    fromLocationId: string;
    toLocationId: string;
    quantity: number;
    reason: string | null;
    createdById: string | null;
    status: string;
    createdAt: string;
}

/**
 * Fila del desglose de stock por ubicación para un producto
 * (`GET /api/inventory/products/:productId/stock-by-location`).
 * En modo simple la respuesta trae un único row "Stock total" con
 * `locationId: ''` y el total derivado de `Product.stock`.
 */
export interface ProductStockByLocationRowDTO {
    locationId: string;
    locationName: string;
    function: string;
    quantity: number;
}
