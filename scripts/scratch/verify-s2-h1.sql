SELECT column_name, data_type FROM information_schema.columns WHERE table_name IN ('sale_items','purchase_items','stock_movements') AND column_name = 'quantity';
SELECT column_name, data_type FROM information_schema.columns WHERE table_name IN ('sale_items','purchase_items') AND column_name IN ('unitOfMeasureCode','uomConversionToBase','unitCost','taxSnapshot','capabilitySnapshot');
SELECT COUNT(*) AS unit_of_measures_count FROM unit_of_measures;
SELECT code, name, category, "conversionToBase" FROM unit_of_measures ORDER BY category, "conversionToBase" DESC;