G1 — productsApi.generateVariants() not implemented
=====================================================

EVIDENCIA:
  apps/frontend/src/features/products/components/VariantMatrixModal.tsx:245

    try {
      setIsLoading(true);
      // @ts-expect-error generateVariants es gap pre-existente del modal borrado
      await productsApi.generateVariants(parentProductId, { Talle: talles, Color: colores });
      ...
    }

  apps/frontend/src/features/products/api/products.api.ts:
    grep -n "generateVariants" → solo el import en VariantMatrixModal, no la definición.

  CONFIRMADO: el método no existe en el objeto productsApi.

COMPORTAMIENTO EN PRODUCCIÓN:
  El botón "Generar {N} Variantes" tira:
    TypeError: productsApi.generateVariants is not a function

  El toast muestra: "Error al generar la matriz de variantes"
  (cubre el error con el catch del modal pero el método no existe).

CUBIERTO POR:
  - VariantMatrixModal.spec.tsx:
      vi.mock('../api/products.api', () => ({
        attributeOptionsApi: { ... },
        productsApi: {
          // generateVariants es gap pre-existente — ni lo mockeamos para no propagar la mentira
        },
      }));
  - variant-attribute-options-catalog.spec.ts → test.skip(true) en "Pre-existing gaps".

BLOQUEADO POR:
  Depende de decisión: ¿el endpoint BE de generate variants vive en products.controller
  (POST /products/:id/generate-variants) o en variant-attribute-options.controller
  (POST /variant-attribute-options/generate)?

CÓMO DESBLOQUEAR:
  1. Decidir contrato del endpoint BE (propuesta actual del modal:
     POST /products/:parentId/variants con body {Talle: string[], Color: string[]}
     → 201 con lista de SKUs creados).
  2. Implementar endpoint BE con validación y transacciones.
  3. Agregar `generateVariants: (id, body) => api.post(...)` a productsApi.
  4. Quitar el @ts-expect-error del modal.
  5. Reemplazar el test.skip(true) por un test E2E que selecciona 1+1 y clickea
     "Generar" esperando 201 + toaster "¡Se generaron N variantes!".

TICKETS RELACIONADOS (crear en Sprint Final Wave):
  - F3: implementar endpoint BE generate-variants + test integration.
  - F4: implementar productsApi.generateVariants en FE + test E2E.