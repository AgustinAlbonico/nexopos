# Registro de investigación: planificación retail multi-rubro

## Pregunta central

¿Qué funcionalidades comunes, esenciales, opcionales y diferenciadoras necesita NexoPOS para cubrir las ocho familias de comercios minoristas físicos identificadas, y en qué orden conviene desarrollarlas sin crear forks?

## Ejes de investigación iniciales

1. Núcleo y brechas actuales de NexoPOS.
2. Modelo de productos, inventario, ventas y migraciones.
3. Superficie frontend, velocidad de caja y configuración.
4. Instalación local, periféricos, backups y actualizaciones.
5. Venta por unidad simple y productos envasados de alta rotación.
6. Peso, medida, packs, PLU y balanzas.
7. Variantes de indumentaria y calzado.
8. Lotes, vencimientos y trazabilidad.
9. Series, garantías y devoluciones de durables.
10. Consignación, reventa y stock de terceros.
11. Minorista/mayorista, listas de precios y bultos.
12. Patrones de productos POS maduros y diferenciación.
13. Fiscalidad y operación SMB en Argentina.
14. Arquitecturas OSS verificables para capacidades retail.
15. Revisión escéptica de alcance, solapamientos y sobreingeniería.

## Cobertura

- Codebase relevant: sí.
- Fuentes externas: sí.
- Navegación web: sí.
- Verificación por ejecución: sólo si aparecen afirmaciones técnicas controvertidas.
- Material final: síntesis Markdown y planificación legible para producto; HTML sólo si aporta valor real.

## Wave 1

Estado: 15/16 resultados registrados; deep dive ERPNext aún en ejecución.

### Leads abiertos para Wave 2

1. Devoluciones/cambios/notas de crédito como capacidad transversal.
2. Semántica exacta de packs, UOM y bundles.
3. Conteos de stock, importación y etiquetas como herramientas comunes.
4. Balanza, tara, PLU, metrología legal y contingencia offline Argentina.
5. Límites entre descuentos manuales, promociones y loyalty.
6. Matriz mínima transferible de políticas/modelos por capacidad.
7. Restauración, hardware diagnostics y update safety para producto local.
8. Reglas Argentina/MERCOSUR para lotes/vencimientos no farmacéuticos.

### Deducciones cerradas

- Multi-currency: fuera de alcance sin demanda concreta.
- Multi-location real y transfers: fuera de alcance de esta planificación inicial.
- Repairs/services: fuera de alcance salvo garantía/RMA vinculada a venta física.

## Wave 2

Estado: 6 resultados sustantivos registrados, 1 Oracle parcialmente descartado por contaminación de fuentes, 3 lanes aún activas.

### Leads abiertos para Wave 3

1. Validar las siete policy boundaries exclusivamente contra el repositorio real.
2. Diseñar devolución parcial/cambio como documento y verificar nota de crédito ARCA.
3. Precisar importación validada, stocktake y etiquetas como capacidades comunes.
4. Verificar prioridad/dependencias de desarrollo sin build-all.
5. Auditar matriz completa por familia contra diferenciadores reales y core transversal.

### Leads cerrados

- Semántica UOM/pack/bundle/logistics package: resuelta.
- Normas argentinas de lote/vencimiento no farmacéutico: resueltas.
- Deep dive ERPNext completo: cerrado por timeout y evidencia duplicada.

## Wave 3

Estado: completada; 6 lanes registradas más 3 lanes Wave 2 tardías.

### Cierre de leads

- Policies: revalidadas sólo contra repo; contaminación anterior descartada.
- Returns/ARCA: claims fiscales verificados con texto primario.
- Import/labels/stocktake: vendor set saturado.
- Diferenciadores por familia: calibrados y mezclas documentadas.
- Promociones/loyalty: taxonomía separada; edge limits cerrados como duplicados.
- Resiliencia local: requirements saturados; exact device models quedan para deployment.
- Balanzas: integración/protocolo model-bound; contingencia offline y metrología local quedan unresolved, no bloquean arquitectura.
- Roadmap: secuencia por dependencias establecida.

### Convergencia

- Dos waves de expansión ejecutadas.
- Cero leads arquitectónicos/comerciales sin clasificar.
- Los únicos gaps son claims legales/operativos locales marcados unresolved y excluidos de afirmaciones finales.
- Convergence reason: no unchecked actionable leads remain.
