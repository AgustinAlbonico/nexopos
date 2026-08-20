SELECT id, name, status, "startedAt" FROM stocktake_sessions ORDER BY "startedAt" DESC;
SELECT id, "productId", "expectedQuantity", "countedQuantity" FROM stocktake_lines;
SELECT id, "productId", type, source, quantity, notes, "createdAt" FROM stock_movements ORDER BY "createdAt" DESC LIMIT 20;
SELECT id, name, stock, barcode FROM products ORDER BY "createdAt" DESC LIMIT 10;