# Wave 1 — Peso y medida

## Hallazgos
- Fuente parcial: GS1 identifica peso/precio variable mediante AIs y códigos de medida; ARCA documenta comprobantes de control de peso/balanzas fiscales.
- Deben cubrirse precisión decimal, UOM, tara, PLU, código peso/precio embebido, balanza, etiquetas, merma y devoluciones.
- La línea quedó incompleta por rate limits y requiere expansión específica.

## Fuentes
- GS1 AIs: https://gs1.org/standards/barcodes/application-identifiers
- GS1 2D retail: https://ref.gs1.org/guidelines/2d-in-retail/1.1.0/GS1-2DRetailPOS-Guideline-i1.1-r-2025-12-15
- ARCA balanzas fiscales: https://www.afip.gob.ar/balanzasFiscales/comprobantes/datos-modelo-comprobantes.asp

## EXPAND
- LEAD: complete Argentina metrology + scale integration + tare/PLU workflow — WHY: first pass incomplete — ANGLE: official INTI/ARCA/GS1 and scale vendor docs.

## CLAIMS
- Weight/measure cannot be represented as a superficial profile toggle.
