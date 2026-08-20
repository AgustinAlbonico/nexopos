const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

async function generateCompleteGuidePdf() {
    const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>NexoPOS - Guía Maestra Funcional y Manual de Validación</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap');

        @page {
            size: A4;
            margin: 16mm 14mm 16mm 14mm;
            @bottom-right {
                content: counter(page) " / " counter(pages);
                font-family: 'Inter', sans-serif;
                font-size: 8pt;
                font-weight: 600;
                color: #64748b;
            }
            @bottom-left {
                content: "NexoPOS · Guía Maestra Funcional & Protocolo de Validación";
                font-family: 'Inter', sans-serif;
                font-size: 8pt;
                color: #64748b;
            }
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            color: #0f172a;
            background-color: #ffffff;
            margin: 0;
            padding: 0;
            font-size: 8.7pt;
            line-height: 1.48;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .cover {
            page-break-after: always;
            min-height: 92vh;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding: 25px 10px 10px 10px;
            box-sizing: border-box;
        }

        .cover-badge {
            display: inline-block;
            background: #0f172a;
            color: #ffffff;
            font-weight: 700;
            font-size: 8pt;
            padding: 5px 12px;
            border-radius: 9999px;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            margin-bottom: 16px;
        }

        .cover-title {
            font-size: 26pt;
            font-weight: 900;
            color: #0f172a;
            line-height: 1.15;
            margin: 0 0 12px 0;
            letter-spacing: -0.6px;
        }

        .cover-subtitle {
            font-size: 12.5pt;
            font-weight: 400;
            color: #475569;
            margin: 0 0 22px 0;
            line-height: 1.4;
        }

        .cover-divider {
            height: 4px;
            width: 70px;
            background: #2563eb;
            border-radius: 2px;
            margin-bottom: 22px;
        }

        .cover-intro {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 14px 18px;
            font-size: 9pt;
            color: #334155;
            line-height: 1.6;
        }

        .cover-meta {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 14px 18px;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            margin-top: 25px;
        }

        .meta-item {
            display: flex;
            flex-direction: column;
        }

        .meta-label {
            font-size: 7pt;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 700;
            color: #64748b;
        }

        .meta-value {
            font-size: 9.5pt;
            font-weight: 600;
            color: #1e293b;
            margin-top: 2px;
        }

        .page-header {
            margin-bottom: 14px;
            padding-bottom: 6px;
            border-bottom: 2px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
        }

        .page-header h2 {
            font-size: 12.5pt;
            font-weight: 800;
            color: #0f172a;
            margin: 0;
            letter-spacing: -0.3px;
        }

        .section-tag {
            font-size: 7.5pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #2563eb;
        }

        .item-card {
            border: 1px solid #e2e8f0;
            border-radius: 7px;
            padding: 10px 12px;
            background: #ffffff;
            margin-bottom: 11px;
            page-break-inside: avoid;
        }

        .item-card.apparel {
            border: 1.5px solid #d8b4fe;
            background: #faf5ff;
        }

        .item-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 5px;
        }

        .item-title {
            font-size: 10pt;
            font-weight: 800;
            color: #1e293b;
        }

        .tag-common {
            background: #e2e8f0;
            color: #334155;
            font-size: 6.5pt;
            font-weight: 700;
            padding: 2px 7px;
            border-radius: 9999px;
            text-transform: uppercase;
        }

        .tag-apparel {
            background: #f3e8ff;
            color: #7e22ce;
            border: 1px solid #d8b4fe;
            font-size: 6.5pt;
            font-weight: 700;
            padding: 2px 7px;
            border-radius: 9999px;
            text-transform: uppercase;
        }

        .block-problem {
            background: #fef2f2;
            border-left: 3px solid #ef4444;
            padding: 5px 8px;
            border-radius: 0 4px 4px 0;
            margin-bottom: 5px;
            font-size: 8.2pt;
            color: #991b1b;
        }

        .block-problem strong {
            color: #7f1d1d;
        }

        .block-solution {
            background: #f0fdf4;
            border-left: 3px solid #22c55e;
            padding: 5px 8px;
            border-radius: 0 4px 4px 0;
            margin-bottom: 5px;
            font-size: 8.2pt;
            color: #166534;
        }

        .block-solution strong {
            color: #14532d;
        }

        .block-test {
            background: #eff6ff;
            border-left: 3px solid #3b82f6;
            padding: 6px 10px;
            border-radius: 0 4px 4px 0;
            margin-top: 4px;
            font-size: 8.2pt;
            color: #1e40af;
        }

        .block-test strong {
            color: #1e3a8a;
            display: block;
            margin-bottom: 3px;
        }

        .block-test ol {
            margin: 0;
            padding-left: 15px;
        }

        .block-test li {
            margin-bottom: 2px;
            color: #1e3a8a;
        }

        .key-badge {
            font-family: 'JetBrains Mono', monospace;
            background: #e2e8f0;
            color: #0f172a;
            padding: 1px 4px;
            border-radius: 3px;
            font-size: 7.5pt;
            font-weight: 600;
        }

        .page-break {
            page-break-after: always;
        }

        .comparison-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 7.8pt;
            margin-top: 10px;
            page-break-inside: avoid;
        }

        .comparison-table th {
            background: #0f172a;
            color: #f8fafc;
            padding: 6px 8px;
            text-align: left;
            font-weight: 700;
            border: 1px solid #0f172a;
        }

        .comparison-table td {
            padding: 6px 8px;
            border: 1px solid #e2e8f0;
            color: #334155;
            vertical-align: top;
        }

        .comparison-table tr:nth-child(even) {
            background: #f8fafc;
        }

        .comparison-table td.apparel-cell {
            background: #fdf4ff;
            font-weight: 600;
            color: #6b21a8;
        }
    </style>
</head>
<body>

    <!-- PORTADA -->
    <div class="cover">
        <div>
            <span class="cover-badge">NexoPOS · Manual de Arquitectura & Protocolo de Validación</span>
            <h1 class="cover-title">Guía Maestra Funcional y de Pruebas</h1>
            <p class="cover-subtitle">Catálogo Completo: Problema de Negocio, Solución en el Sistema y Paso a Paso para Probar Cada Módulo.</p>
            <div class="cover-divider"></div>

            <div class="cover-intro">
                <strong>Estructura de esta Guía:</strong>
                <br>Este documento fue diseñado para que cualquier usuario, auditor o implementador pueda comprender la plataforma en profundidad:
                <br>• <strong>Parte 1: Núcleo Transversal (Core)</strong> — Qué hace cada módulo común a cualquier comercio (Ferretería, Kiosco, Almacén, Indumentaria) y cómo probarlo.
                <br>• <strong>Parte 2: Especialización de Indumentaria (Apparel Engine)</strong> — Cómo se transforma el sistema para una tienda de ropa y calzado, detallando el dolor del rubro, la solución arquitectónica y el paso a paso de validación en mostrador.
                <br>• <strong>Parte 3: Matriz Comparativa</strong> — Cuadro resumen de diferencias funcionales entre rubros generales y moda.
            </div>
        </div>

        <div class="cover-meta">
            <div class="meta-item">
                <span class="meta-label">Plataforma</span>
                <span class="meta-value">NexoPOS ERP & POS Multi-Rubro</span>
            </div>
            <div class="meta-item">
                <span class="meta-label">Perfil de Negocio Activo</span>
                <span class="meta-value">Indumentaria y Calzado (Apparel)</span>
            </div>
            <div class="meta-item">
                <span class="meta-label">Cobertura de Pruebas</span>
                <span class="meta-value">100% Validado con Playwright & Vitest</span>
            </div>
            <div class="meta-item">
                <span class="meta-label">Versión / Fecha</span>
                <span class="meta-value">v1.1.0 · Agosto 2026</span>
            </div>
        </div>
    </div>

    <!-- PARTE 1: NÚCLEO COMÚN -->
    <div class="page-header">
        <h2>1. Núcleo Común: Funcionalidades Transversales</h2>
        <span class="section-tag">Core Engine</span>
    </div>

    <!-- 1.1 POS -->
    <div class="item-card">
        <div class="item-header">
            <span class="item-title">🛒 1.1 Punto de Venta (POS) & Atajos Rápidos de Teclado</span>
            <span class="tag-common">Común</span>
        </div>
        <div class="block-problem">
            <strong>❌ El Problema que Resuelve:</strong> Las demoras y cuellos de botella en la fila de cobro. Si el cajero debe depender del mouse para buscar, cambiar cantidades y liquidar, el tiempo de atención se triplica.
        </div>
        <div class="block-solution">
            <strong>✓ Cómo Funciona en el Sistema:</strong> Operación 100% por teclado con teclas <span class="key-badge">F1</span> (Buscar), <span class="key-badge">F2</span> (Cantidad), <span class="key-badge">F8</span> (Confirmar/Cobrar), <span class="key-badge">F9</span> (Posponer venta) y <span class="key-badge">ESC</span> (Cancelar). El buscador mantiene autofoco para lectores de código de barras. Soporta múltiples medios de pago simultáneos (Efectivo, Débito, Crédito, Transferencia, QR, Cta Cte) y calcula el vuelto en vivo.
        </div>
        <div class="block-test">
            <strong>🧪 Paso a Paso para Probarlo en el Sistema:</strong>
            <ol>
                <li>Ir a <strong>Ventas</strong> ➔ Clic en <strong>"Nueva Venta"</strong>.</li>
                <li>Presionar <span class="key-badge">F1</span> y escribir el nombre o código de un producto para sumarlo al ticket.</li>
                <li>Presionar <span class="key-badge">F2</span> para modificar la cantidad y presionar <span class="key-badge">Enter</span>.</li>
                <li>Presionar <span class="key-badge">F9</span> (Posponer): la venta queda en espera. Atender otra venta y luego recuperarla en 1 clic.</li>
                <li>Ingresar el monto en Efectivo y presionar <span class="key-badge">F8</span> para finalizar la venta e imprimir el ticket.</li>
            </ol>
        </div>
    </div>

    <!-- 1.2 Control de Caja -->
    <div class="item-card">
        <div class="item-header">
            <span class="item-title">💵 1.2 Control de Caja y Arqueo Ciego de Turno</span>
            <span class="tag-common">Común</span>
        </div>
        <div class="block-problem">
            <strong>❌ El Problema que Resuelve:</strong> Desvíos de dinero no detectados. Cuando el cajero sabe de antemano el saldo teórico del sistema antes de contar la plata, es fácil ocultar faltantes o manipular el cierre.
        </div>
        <div class="block-solution">
            <strong>✓ Cómo Funciona en el Sistema:</strong> Al iniciar la jornada se declara el fondo inicial de cambio. Al cierre, el cajero realiza un <strong>Arqueo Ciego</strong> (cuenta los billetes y tipea la cantidad real sin ver el saldo del sistema). El software cruza lo registrado en el turno contra lo declarado físicamente, generando un informe inmutable con los sobrantes o faltantes exactos.
        </div>
        <div class="block-test">
            <strong>🧪 Paso a Paso para Probarlo en el Sistema:</strong>
            <ol>
                <li>Ir a <strong>Caja</strong> en el menú lateral.</li>
                <li>Verificar el estado del turno actual (ventas en efectivo, transferencias, retiros).</li>
                <li>Hacer clic en <strong>"Movimiento Manual"</strong> para registrar un egreso (ej. pago de flete $2.000).</li>
                <li>Hacer clic en <strong>"Cerrar Caja"</strong>, ingresar el conteo físico de billetes y confirmar: el sistema emite el reporte con el balance final y diferencias.</li>
            </ol>
        </div>
    </div>

    <div class="page-break"></div>

    <div class="page-header">
        <h2>1. Núcleo Común (Continuación)</h2>
        <span class="section-tag">Core Engine</span>
    </div>

    <!-- 1.3 Clientes y Ctas Ctes -->
    <div class="item-card">
        <div class="item-header">
            <span class="item-title">👥 1.3 Clientes y Cuentas Corrientes (Créditos / Fiados)</span>
            <span class="tag-common">Común</span>
        </div>
        <div class="block-problem">
            <strong>❌ El Problema que Resuelve:</strong> El desorden de anotar deudas en cuadernos o planillas, provocando olvidos de cobro y ventas a clientes que superaron su capacidad de pago.
        </div>
        <div class="block-solution">
            <strong>✓ Cómo Funciona en el Sistema:</strong> Cada cliente cuenta con una ficha con CUIT/DNI y un límite de crédito fijado. Al vender en el POS, se selecciona el cliente y se activa "Venta en Cuenta Corriente". El módulo de Cuentas Corrientes permite consultar saldos consolidados, imputar pagos parciales o totales emitiendo recibos de cobro y descargar el resumen en PDF.
        </div>
        <div class="block-test">
            <strong>🧪 Paso a Paso para Probarlo en el Sistema:</strong>
            <ol>
                <li>Ir a <strong>Clientes</strong> ➔ Crear o editar un cliente asignándole un límite de crédito de $100.000.</li>
                <li>Ir al <strong>POS</strong> ➔ Agregar productos ➔ Seleccionar dicho cliente ➔ Marcar el checkbox <em>"Venta en Cuenta Corriente"</em> ➔ Confirmar.</li>
                <li>Ir a <strong>Cuentas Corrientes</strong> en el menú lateral ➔ Buscar al cliente: se observa la deuda generada.</li>
                <li>Hacer clic en <strong>"Registrar Cobro"</strong>, ingresar un pago parcial (ej. $20.000) y verificar la actualización del saldo y el recibo.</li>
            </ol>
        </div>
    </div>

    <!-- 1.4 Facturación Fiscal AFIP -->
    <div class="item-card">
        <div class="item-header">
            <span class="item-title">🏛️ 1.4 Facturación Fiscal Integrada (AFIP / ARCA)</span>
            <span class="tag-common">Común</span>
        </div>
        <div class="block-problem">
            <strong>❌ El Problema que Resuelve:</strong> La doble carga administrativa de facturar manualmente en la web de AFIP con clave fiscal y luego tener que registrar la venta por separado en el software para descontar el stock.
        </div>
        <div class="block-solution">
            <strong>✓ Cómo Funciona en el Sistema:</strong> Conexión directa por Web Service (WSFE). Al ingresar el CUIT en el POS, el sistema consulta en vivo el padrón de AFIP y autocompleta la Razón Social y condición de IVA. Al confirmar la venta, solicita el CAE y genera la Factura A, B, C o Nota de Crédito con el código QR oficial en menos de 2 segundos.
        </div>
        <div class="block-test">
            <strong>🧪 Paso a Paso para Probarlo en el Sistema:</strong>
            <ol>
                <li>En <strong>Configuración ➔ Facturación Fiscal</strong>, verificar los puntos de venta y certificados digitales cargados.</li>
                <li>Ir al <strong>POS</strong>, activar el toggle <em>"Factura Fiscal"</em> y seleccionar un cliente con CUIT.</li>
                <li>Confirmar la venta: el sistema obtiene el CAE de AFIP y muestra el comprobante fiscal oficial con su QR normativo.</li>
                <li>Ir a <strong>Reportes ➔ Libro IVA Ventas</strong> para ver el registro fiscal listo para exportar al contador.</li>
            </ol>
        </div>
    </div>

    <!-- 1.5 Compras y Costos -->
    <div class="item-card">
        <div class="item-header">
            <span class="item-title">📦 1.5 Compras, Proveedores y Actualización de Costos</span>
            <span class="tag-common">Común</span>
        </div>
        <div class="block-problem">
            <strong>❌ El Problema que Resuelve:</strong> Vender a precios desactualizados por no registrar oportunamente los aumentos de lista del proveedor, destruyendo el margen de rentabilidad.
        </div>
        <div class="block-solution">
            <strong>✓ Cómo Funciona en el Sistema:</strong> Al ingresar una factura de compra del proveedor con los nuevos costos, el sistema actualiza automáticamente el costo unitario de los productos, ingresa las unidades compradas al inventario disponible y recalcula los precios de venta de acuerdo al margen de ganancia configurado.
        </div>
        <div class="block-test">
            <strong>🧪 Paso a Paso para Probarlo en el Sistema:</strong>
            <ol>
                <li>Ir a <strong>Compras ➔ "Nueva Compra"</strong>.</li>
                <li>Seleccionar un proveedor, cargar el número de factura y agregar un producto ingresando un costo mayor.</li>
                <li>Confirmar la compra: verificar que el stock aumentó en el módulo de Inventario y el precio de venta se actualizó.</li>
            </ol>
        </div>
    </div>

    <div class="page-break"></div>

    <div class="page-header">
        <h2>1. Núcleo Común (Continuación)</h2>
        <span class="section-tag">Core Engine</span>
    </div>

    <!-- 1.6 Gastos e Ingresos -->
    <div class="item-card">
        <div class="item-header">
            <span class="item-title">💸 1.6 Gastos Operativos e Ingresos Extraordinarios</span>
            <span class="tag-common">Común</span>
        </div>
        <div class="block-problem">
            <strong>❌ El Problema que Resuelve:</strong> Desconocer los costos ocultos del negocio (alquiler, luz, fletes, packaging, sueldos) que erosionan la ganancia real sin quedar registrados en el sistema.
        </div>
        <div class="block-solution">
            <strong>✓ Cómo Funciona en el Sistema:</strong> Permite registrar y categorizar todos los egresos del negocio, indicando si fueron pagados en efectivo desde la caja o con fondos bancarios. Estos gastos se deducen automáticamente en el Estado de Resultados para reflejar la ganancia neta real.
        </div>
        <div class="block-test">
            <strong>🧪 Paso a Paso para Probarlo en el Sistema:</strong>
            <ol>
                <li>Ir a <strong>Gastos ➔ "Nuevo Gasto"</strong>.</li>
                <li>Seleccionar la categoría (ej. <em>Alquiler o Servicios</em>), ingresar el monto (ej. $50.000) y marcar si fue pagado en el acto.</li>
                <li>Ir a <strong>Reportes</strong>: comprobar cómo el monto se deduce automáticamente del balance de Ganancia Neta del mes.</li>
            </ol>
        </div>
    </div>

    <!-- 1.7 Analítica Financiera -->
    <div class="item-card">
        <div class="item-header">
            <span class="item-title">📈 1.7 Analítica Financiera & Rentabilidad Neta Real</span>
            <span class="tag-common">Común</span>
        </div>
        <div class="block-problem">
            <strong>❌ El Problema que Resuelve:</strong> Tomar decisiones a ciegas. Muchos comerciantes miran solo el volumen de facturación bruta sin saber cuál es su margen de rentabilidad neta real tras deducir costos y gastos.
        </div>
        <div class="block-solution">
            <strong>✓ Cómo Funciona en el Sistema:</strong> El módulo de Reportes calcula automáticamente:  
            <em>Ventas Totales − Costo de Mercadería Vendida (CMV) = Ganancia Bruta</em>, y luego resta los <em>Gastos Operativos</em> para obtener la <strong>Ganancia Neta Real</strong> y el <strong>Margen % Operativo</strong>. Incluye desglose por medio de pago y flujo de fondos.
        </div>
        <div class="block-test">
            <strong>🧪 Paso a Paso para Probarlo en el Sistema:</strong>
            <ol>
                <li>Ir a <strong>Reportes</strong> en el menú lateral.</li>
                <li>En la pestaña <strong>Resumen</strong>, revisar las tarjetas de <em>Ventas Totales</em>, <em>Costo de Mercadería</em> y <em>Ganancia Neta</em>.</li>
                <li>Filtrar por rango de fechas (Hoy, Esta Semana, Mes Actual) para comparar la evolución del margen comercial.</li>
            </ol>
        </div>
    </div>

    <div class="page-break"></div>

    <!-- PARTE 2: ESPECIALIZACIÓN INDUMENTARIA -->
    <div class="page-header">
        <h2>2. Especialización en Indumentaria y Calzado</h2>
        <span class="section-tag" style="color:#7e22ce">Apparel Engine</span>
    </div>

    <!-- 2.1 Modelo Padre y Matriz -->
    <div class="item-card apparel">
        <div class="item-header">
            <span class="item-title">👗 2.1 Modelo Padre y Matriz Cartesiana (Talle × Color)</span>
            <span class="tag-apparel">Exclusivo Indumentaria</span>
        </div>
        <div class="block-problem">
            <strong>❌ El Problema en Ropa:</strong> Cargar una prenda que viene en 4 talles (S, M, L, XL) y 3 colores (Negro, Blanco, Azul) obliga en sistemas comunes a crear 12 productos separados. El catálogo se llena de ítems duplicados, los filtros fallan y la carga inicial es agotadora.
        </div>
        <div class="block-solution">
            <strong>✓ Cómo Funciona en NexoPOS:</strong> Se crea un solo <strong>"Modelo Padre"</strong> (ej. <em>Remera Oversize Tokio</em>) con su ficha textil: <strong>Temporada</strong> (ej. <em>Primavera-Verano 2026</em>), <strong>Colección</strong> (ej. <em>Cápsula E2E</em>), <strong>Composición</strong> (<em>100% Algodón Peinado</em>), cuidados de lavado y <strong>Guía de Talles (Size Chart)</strong>. Al hacer clic en <em>"Generar Matriz"</em>, el sistema cruza los talles y colores y crea automáticamente las 12 variantes hijas con sus códigos en 1 clic.
        </div>
        <div class="block-test">
            <strong>🧪 Paso a Paso para Probarlo en el Sistema:</strong>
            <ol>
                <li>Ir a <strong>Productos ➔ "Nuevo Producto"</strong>.</li>
                <li>Activar el switch <em>"Es Modelo Padre (Tiene Variantes)"</em> y completar Nombre, Temporada y Colección.</li>
                <li>Hacer clic en <strong>"Generar Variantes"</strong>, ingresar los talles (<code style="background:#f3e8ff;padding:1px 3px;border-radius:2px">S, M, L, XL</code>) y colores (<code style="background:#f3e8ff;padding:1px 3px;border-radius:2px">Negro, Blanco, Azul</code>).</li>
                <li>Guardar: el sistema genera las 12 variantes hijas manteniendo el catálogo limpio y estructurado.</li>
            </ol>
        </div>
    </div>

    <!-- 2.2 Selector Visual 2D en POS -->
    <div class="item-card apparel">
        <div class="item-header">
            <span class="item-title">🎛️ 2.2 Selector Visual 2D en Mostrador ("Talles y Colores")</span>
            <span class="tag-apparel">Exclusivo Indumentaria</span>
        </div>
        <div class="block-problem">
            <strong>❌ El Problema en Ropa:</strong> Cuando un cliente entra al local y pregunta: <em>"¿Tenés esta remera en talle L pero color Negro?"</em>, el cajero tiene que escribir el nombre completo en un buscador o ir al depósito a revisar el perchero a ciegas.
        </div>
        <div class="block-solution">
            <strong>✓ Cómo Funciona en NexoPOS:</strong> En el POS, el cajero hace clic en el botón <strong>"Talles y Colores"</strong>. Se abre una grilla bidimensional ($Talles \times Colores$) del modelo elegido. De un vistazo ve el stock en tiempo real de cada talle y color (ej. <em>L Blanco: 6 u., M Negro: 6 u., XL Azul: 0 u.</em>). Al tocar una celda con stock, la prenda se agrega automáticamente al ticket.
        </div>
        <div class="block-test">
            <strong>🧪 Paso a Paso para Probarlo en el Sistema:</strong>
            <ol>
                <li>Ir a <strong>Ventas ➔ "Nueva Venta"</strong>.</li>
                <li>Hacer clic en el botón <strong>"Talles y Colores"</strong> (junto al buscador de productos).</li>
                <li>Seleccionar el modelo <em>"Remera Test Manual Direct"</em> en el desplegable.</li>
                <li>Verificar la grilla 2D: columnas de talles (L, M, S, XL) y filas de colores (Azul, Blanco, Negro) con sus insignias de stock ($6\text{ u.}$).</li>
                <li>Hacer clic en la celda <em>"Negro - M"</em>: la prenda entra directo al ticket de venta del POS.</li>
            </ol>
        </div>
    </div>

    <div class="page-break"></div>

    <div class="page-header">
        <h2>2. Especialización en Indumentaria (Continuación)</h2>
        <span class="section-tag" style="color:#7e22ce">Apparel Engine</span>
    </div>

    <!-- 2.3 Cambios Express -->
    <div class="item-card apparel">
        <div class="item-header">
            <span class="item-title">🔄 2.3 Cambios Express de Prenda en Mostrador</span>
            <span class="tag-apparel">Exclusivo Indumentaria</span>
        </div>
        <div class="block-problem">
            <strong>❌ El Problema en Ropa:</strong> El 20% al 30% de la actividad diaria en una tienda de ropa son cambios de talle o modelo. En otros sistemas hay que hacer 3 pasos: emitir una nota de crédito, hacer una venta nueva y conciliar manualmente la diferencia en la caja, generando colas y fricción.
        </div>
        <div class="block-solution">
            <strong>✓ Cómo Funciona en NexoPOS:</strong> En el POS se hace clic en <strong>"Cambio de Prenda"</strong>. En una sola pantalla dividida en dos columnas:
            <br>1) <em>Columna 1: Prenda a Devolver</em> (reingresa automáticamente al inventario).
            <br>2) <em>Columna 2: Prenda Nueva</em> (se descuenta del inventario).
            <br>El sistema calcula la diferencia al instante: si valen lo mismo el saldo es $0; si la nueva es más cara, calcula la diferencia a cobrar; si es menor, emite el crédito a favor.
        </div>
        <div class="block-test">
            <strong>🧪 Paso a Paso para Probarlo en el Sistema:</strong>
            <ol>
                <li>En <strong>Nueva Venta</strong>, hacer clic en el botón <strong>"Cambio de Prenda"</strong>.</li>
                <li>En la columna izquierda, buscar la prenda devuelta (ej. <em>Remera S Negro</em>).</li>
                <li>En la columna derecha, buscar la prenda nueva que se lleva el cliente (ej. <em>Remera M Blanco</em>).</li>
                <li>Comprobar el cálculo automático de saldo ($0 o diferencia) y confirmar con un solo clic.</li>
            </ol>
        </div>
    </div>

    <!-- 2.4 Motor de Promociones Textiles -->
    <div class="item-card apparel">
        <div class="item-header">
            <span class="item-title">🏷️ 2.4 Motor de Promociones de Ropa con Protección de Margen</span>
            <span class="tag-apparel">Exclusivo Indumentaria</span>
        </div>
        <div class="block-problem">
            <strong>❌ El Problema en Ropa:</strong> En promociones como <em>2x1</em> o <em>2da al 50%</em>, cuando el cliente combina prendas de distinto valor (ej. un buzo de $40.000 y una remera de $20.000), aplicar un porcentaje manual hace que el negocio pierda plata porque descuenta del artículo más caro.
        </div>
        <div class="block-solution">
            <strong>✓ Cómo Funciona en NexoPOS:</strong> El totalizador del POS cuenta con chips rápidos de 1 clic (<code style="background:#f3e8ff;padding:1px 3px;border-radius:2px">2x1</code>, <code style="background:#f3e8ff;padding:1px 3px;border-radius:2px">2da 50%</code>, <code style="background:#f3e8ff;padding:1px 3px;border-radius:2px">3x2</code>, <code style="background:#f3e8ff;padding:1px 3px;border-radius:2px">10%</code>, <code style="background:#f3e8ff;padding:1px 3px;border-radius:2px">15%</code>). El algoritmo identifica automáticamente los precios de cada prenda en el ticket y <strong>descuenta siempre la prenda de menor o igual valor</strong>, garantizando que el comerciante nunca pierda margen.
        </div>
        <div class="block-test">
            <strong>🧪 Paso a Paso para Probarlo en el Sistema:</strong>
            <ol>
                <li>En el POS, cargar 2 prendas (ej. 2 remeras de $18.500 = Subtotal $37.000).</li>
                <li>En el panel lateral de totales, hacer clic en el chip <strong>"2x1"</strong>: el descuento pasa a -$18.500 y el total a $18.500.</li>
                <li>Hacer clic en el chip <strong>"2da 50%"</strong>: el descuento pasa a -$9.250 y el total se recalcula a $27.750, ajustando el cobro en efectivo automáticamente.</li>
            </ol>
        </div>
    </div>

    <!-- 2.5 Precios en Cascada -->
    <div class="item-card apparel">
        <div class="item-header">
            <span class="item-title">⚡ 2.5 Actualización de Precios en Cascada (Parent ➔ Child)</span>
            <span class="tag-apparel">Exclusivo Indumentaria</span>
        </div>
        <div class="block-problem">
            <strong>❌ El Problema en Ropa:</strong> Cuando sube el costo de la tela o la confección, cambiar el precio de 10 modelos que tienen 12 talles y colores implica editar 120 artículos a mano.
        </div>
        <div class="block-solution">
            <strong>✓ Cómo Funciona en NexoPOS:</strong> El comerciante solo ingresa al <strong>Modelo Padre</strong> y modifica el precio de venta o el costo. Al guardar, el backend propaga el cambio en cascada a todas las variantes hijas en milisegundos.
        </div>
        <div class="block-test">
            <strong>🧪 Paso a Paso para Probarlo en el Sistema:</strong>
            <ol>
                <li>Ir a <strong>Productos</strong> ➔ Editar el modelo padre <em>"Remera Test Manual Direct"</em>.</li>
                <li>Cambiar su precio de $18.500 a $20.000 y guardar.</li>
                <li>Abrir el selector de matriz en el POS: las 12 variantes hijas ya tienen su precio actualizado a $20.000.</li>
            </ol>
        </div>
    </div>

    <div class="page-break"></div>

    <div class="page-header">
        <h2>2. Especialización en Indumentaria (Continuación)</h2>
        <span class="section-tag" style="color:#7e22ce">Apparel Engine</span>
    </div>

    <!-- 2.6 Alerta de Curvas Rotas -->
    <div class="item-card apparel">
        <div class="item-header">
            <span class="item-title">⚠️ 2.6 Alerta de Curvas Rotas (Talles Faltantes / Quiebres)</span>
            <span class="tag-apparel">Exclusivo Indumentaria</span>
        </div>
        <div class="block-problem">
            <strong>❌ El Problema en Ropa:</strong> "Curva Rota" es cuando un modelo agotó los talles más vendidos (ej. M y L), pero quedan unidades clavadas en talles extremos (XS o XXL). La prenda queda inmovilizada en el perchero y el dueño no se entera hasta que termina la temporada con mercadería sin vender.
        </div>
        <div class="block-solution">
            <strong>✓ Cómo Funciona en NexoPOS:</strong> En la pestaña de Reportes de Indumentaria, el sistema escanea el inventario y lista los modelos con curva rota, indicando con claridad: <strong>❌ Talles Agotados</strong> vs. <strong>✓ Talles con Stock</strong>. Esto le permite al comerciante reponer talles a tiempo con el taller o armar promociones de liquidación para los talles remanentes.
        </div>
        <div class="block-test">
            <strong>🧪 Paso a Paso para Probarlo en el Sistema:</strong>
            <ol>
                <li>Ir a <strong>Reportes</strong> ➔ Seleccionar la pestaña <strong>"Indumentaria & Comisiones"</strong>.</li>
                <li>Revisar la tarjeta <strong>"Alerta de Curvas Rotas (Talles Faltantes)"</strong>.</li>
                <li>Verificar que lista el modelo con talle faltante (ej. <em>❌ Talle Agotado: XL</em> y <em>✓ Talles con Stock: S, M, L</em>) con su stock remanente para accionar la reposición.</li>
            </ol>
        </div>
    </div>

    <!-- 2.7 Curvas de Salida y Sell-Through -->
    <div class="item-card apparel">
        <div class="item-header">
            <span class="item-title">📊 2.7 Curvas de Salida por Talle/Color y Sell-Through</span>
            <span class="tag-apparel">Exclusivo Indumentaria</span>
        </div>
        <div class="block-problem">
            <strong>❌ El Problema en Ropa:</strong> Comprar a ciegas para la próxima temporada. Muchos comerciantes compran la misma cantidad de talles S, M, L y XL (proporción 1:1:1:1) y terminan con exceso de talles chicos y falta de talles grandes.
        </div>
        <div class="block-solution">
            <strong>✓ Cómo Funciona en NexoPOS:</strong> Genera la <strong>Curva de Salida por Talle (%)</strong> y <strong>por Color (%)</strong> en base a las ventas reales del local (ej. <em>Talle L representa el 45% de las ventas, M el 35%, S el 15%, XL el 5%</em>). Con esta métrica y la tasa de rotación (<em>Sell-Through</em>), el comerciante compra exactamente lo que su clientela demanda.
        </div>
        <div class="block-test">
            <strong>🧪 Paso a Paso para Probarlo en el Sistema:</strong>
            <ol>
                <li>Ir a <strong>Reportes ➔ Pestaña "Indumentaria & Comisiones"</strong>.</li>
                <li>Verificar los gráficos de <em>Curva de Salida por Talle</em> y <em>Curva de Salida por Color</em>.</li>
                <li>Consultar la <em>Tasa de Rotación (Sell-Through Rate)</em> para saber qué porcentaje del stock ingresado ya fue vendido en la temporada.</li>
            </ol>
        </div>
    </div>

    <!-- 2.8 Comisiones por Vendedor -->
    <div class="item-card apparel">
        <div class="item-header">
            <span class="item-title">🎖️ 2.8 Comisiones para Vendedores de Salón</span>
            <span class="tag-apparel">Exclusivo Indumentaria</span>
        </div>
        <div class="block-problem">
            <strong>❌ El Problema en Ropa:</strong> En los locales de indumentaria, los vendedores atienden, asesoran y cobran comisiones por ventas. Llevar esto en planillas manuales genera roces, desconfianza y errores en las liquidaciones semanales o mensuales.
        </div>
        <div class="block-solution">
            <strong>✓ Cómo Funciona en NexoPOS:</strong> Al facturar en el POS se selecciona el vendedor responsable. El sistema calcula en tiempo real su comisión porcentual sobre las ventas netas y entrega un reporte automático de liquidación por vendedor.
        </div>
        <div class="block-test">
            <strong>🧪 Paso a Paso para Probarlo en el Sistema:</strong>
            <ol>
                <li>En el <strong>POS</strong>, completar el campo <em>"Vendedor / Legajo"</em> al realizar una venta.</li>
                <li>Confirmar la venta.</li>
                <li>Ir a <strong>Reportes ➔ Pestaña "Indumentaria & Comisiones"</strong> ➔ Tabla <em>"Comisiones por Vendedor de Salón"</em>: el sistema muestra el total vendido y la comisión neta calculada lista para liquidar.</li>
            </ol>
        </div>
    </div>

    <div class="page-break"></div>

    <!-- PARTE 3: MATRIZ COMPARATIVA -->
    <div class="page-header">
        <h2>3. Matriz Comparativa Resumen: General vs. Indumentaria</h2>
        <span class="section-tag">Visión Arquitectónica</span>
    </div>

    <p style="font-size: 8.5pt; color: #475569; margin-bottom: 10px;">
        Esta matriz resume de qué manera la misma entidad o proceso se adapta y especializa en el sistema según el rubro de negocio activo:
    </p>

    <table class="comparison-table">
        <thead>
            <tr>
                <th style="width: 20%;">Área del Sistema</th>
                <th style="width: 40%;">Comercios Generales (Kiosco, Ferretería, Almacén)</th>
                <th style="width: 40%;">Indumentaria y Calzado (NexoPOS Apparel Engine)</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><strong>1. Catálogo de Productos</strong></td>
                <td>Artículos unitarios planos (ej: <em>Martillo 500g</em>, <em>Gaseosa 500ml</em>) con código de barras y precio fijo.</td>
                <td class="apparel-cell">Modelo Padre con matriz cartesiana de Variantes (Talle × Color), temporadas, colecciones y ficha textil.</td>
            </tr>
            <tr>
                <td><strong>2. Búsqueda y Selección en POS</strong></td>
                <td>Escaneo de código de barras o búsqueda por nombre directo en un buscador estándar.</td>
                <td class="apparel-cell">Buscador filtrado directo + <strong>Selector Visual 2D</strong> con matriz de stock por talle/color en tiempo real.</td>
            </tr>
            <tr>
                <td><strong>3. Cambios y Devoluciones</strong></td>
                <td>Anulación de ticket o emisión de nota de crédito convencional.</td>
                <td class="apparel-cell"><strong>Cambio Express en 1 paso</strong>: reingreso de la prenda devuelta y egreso de la nueva prenda con compensación de saldo automática.</td>
            </tr>
            <tr>
                <td><strong>4. Promociones Comerciales</strong></td>
                <td>Descuentos fijos manuales sobre el subtotal de la venta.</td>
                <td class="apparel-cell"><strong>Promos textiles 1-clic (2x1, 2da 50%, 3x2)</strong> con algoritmo de protección de margen (descuenta la prenda menor).</td>
            </tr>
            <tr>
                <td><strong>5. Gestión de Precios</strong></td>
                <td>Actualización por producto o porcentaje por rubro/proveedor.</td>
                <td class="apparel-cell"><strong>Cascada de Precios</strong>: al editar el modelo padre se actualizan todos los talles y colores en milisegundos.</td>
            </tr>
            <tr>
                <td><strong>6. Inteligencia de Stock</strong></td>
                <td>Alertas por llegar a un stock mínimo de reposición.</td>
                <td class="apparel-cell"><strong>Alerta de Curvas Rotas</strong> (talles centrales agotados con stock remanente) + Curvas de Salida por Talle y Color.</td>
            </tr>
            <tr>
                <td><strong>7. Fuerza de Ventas</strong></td>
                <td>Atención por cajero de mostrador.</td>
                <td class="apparel-cell"><strong>Comisiones a vendedores de salón</strong> con liquidación automática por rendimiento.</td>
            </tr>
        </tbody>
    </table>

    <div style="margin-top: 25px; padding: 12px; border: 1px dashed #cbd5e1; border-radius: 6px; font-size: 8pt; color: #64748b; text-align: center;">
        NexoPOS Architecture System · Guía Maestra Funcional y de Validación · Documento generado en Agosto 2026.
    </div>

</body>
</html>`;

    const htmlPath = path.join(__dirname, 'functional_catalog.html');
    const pdfPath = path.resolve('C:/Proyectos/punto_de_venta/Manual_Funcional_NexoPOS_Indumentaria.pdf');

    fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
    console.log('HTML written to:', htmlPath);

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle' });

    await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
        margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' }
    });

    await browser.close();
    console.log('Master guide PDF successfully generated at:', pdfPath);
}

generateCompleteGuidePdf().catch(err => {
    console.error(err);
    process.exit(1);
});
