import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

async function generatePdf() {
    const desktopPath = path.join(process.env.USERPROFILE || 'C:\\Users\\agust', 'Desktop', 'Guia_Pruebas_Indumentaria.pdf');
    
    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Guía de Pruebas - Módulo Indumentaria & Calzado</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            color: #1e293b;
            background-color: #ffffff;
            line-height: 1.5;
            padding: 40px;
            font-size: 13px;
        }

        .header {
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 20px;
            margin-bottom: 25px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
        }

        .header-title h1 {
            font-size: 24px;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: -0.5px;
        }

        .header-title p {
            color: #64748b;
            font-size: 13px;
            margin-top: 4px;
        }

        .badge {
            background-color: #f1f5f9;
            color: #475569;
            padding: 6px 12px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .step-card {
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 18px 20px;
            margin-bottom: 20px;
            background: #ffffff;
            page-break-inside: avoid;
        }

        .step-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
        }

        .step-number {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: #0ea5e9;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 13px;
        }

        .step-title {
            font-size: 15px;
            font-weight: 700;
            color: #0f172a;
        }

        .route-tag {
            margin-left: auto;
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            padding: 3px 8px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 11px;
            color: #334155;
        }

        ol.substeps {
            padding-left: 20px;
            color: #334155;
            margin-bottom: 12px;
        }

        ol.substeps li {
            margin-bottom: 6px;
        }

        .validation-box {
            background: #f0fdf4;
            border-left: 4px solid #22c55e;
            padding: 10px 14px;
            border-radius: 0 6px 6px 0;
            margin-top: 10px;
        }

        .validation-box strong {
            color: #15803d;
            display: block;
            margin-bottom: 2px;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .validation-box p {
            color: #166534;
            font-size: 12px;
        }

        .note-box {
            background: #eff6ff;
            border-left: 4px solid #3b82f6;
            padding: 10px 14px;
            border-radius: 0 6px 6px 0;
            margin-top: 10px;
            font-size: 12px;
            color: #1e40af;
        }

        .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 11px;
            color: #94a3b8;
            border-top: 1px solid #f1f5f9;
            padding-top: 15px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-title">
            <h1>Guía de Pruebas QA: Módulo Indumentaria & Calzado</h1>
            <p>Paso a paso para validación manual integral en NexoPOS</p>
        </div>
        <div class="badge">NexoPOS v1.1.0</div>
    </div>

    <!-- PASO 1 -->
    <div class="step-card">
        <div class="step-header">
            <div class="step-number">1</div>
            <div class="step-title">Alta de Producto con Atributos de Temporada y Colección</div>
            <div class="route-tag">/products</div>
        </div>
        <ol class="substeps">
            <li>Navegá en el menú lateral a <strong>Productos</strong>.</li>
            <li>Hacé clic en el botón superior derecho <strong>+ Nuevo Producto</strong>.</li>
            <li>Completá los campos básicos: <em>Nombre</em> (ej. "Buzo Oversize Rustik") y <em>Precio</em>.</li>
            <li>Hacé scroll hacia la parte inferior del modal hasta la sección <strong>"DATOS DE INDUMENTARIA & CALZADO"</strong>.</li>
            <li>Completá los campos específicos: <strong>Temporada</strong> (ej. "Invierno 2026") y <strong>Colección / Cápsula</strong> (ej. "Colección Urbana").</li>
            <li>Hacé clic en <strong>Guardar Producto</strong>.</li>
        </ol>
        <div class="validation-box">
            <strong>¿Qué validar?</strong>
            <p>El producto se guarda correctamente, el modal se cierra sin errores y la sección de indumentaria es visible gracias al perfil de negocio activo.</p>
        </div>
    </div>

    <!-- PASO 2 -->
    <div class="step-card">
        <div class="step-header">
            <div class="step-number">2</div>
            <div class="step-title">Generación Automática de Matriz de Variantes (Talles y Colores)</div>
            <div class="route-tag">/products</div>
        </div>
        <ol class="substeps">
            <li>En la tabla de productos, buscá el producto padre creado en el Paso 1.</li>
            <li>En la fila del producto, hacé clic en el botón de acciones de los 3 puntos (<strong>...</strong>) a la derecha.</li>
            <li>Seleccioná la opción <strong>"Generar Variantes (Talles/Colores)"</strong>.</li>
            <li>En el modal, seleccioná los talles deseados (o usá el acceso rápido <em>Ropa: S-XXL</em> / <em>Calzado: 36-44</em>) y los colores deseados.</li>
            <li>Verificá en la tarjeta inferior el cálculo automático de combinaciones (ej. 4 talles × 3 colores = <strong>12 SKUs</strong>).</li>
            <li>Hacé clic en <strong>Generar Variantes</strong>.</li>
        </ol>
        <div class="validation-box">
            <strong>¿Qué validar?</strong>
            <p>El sistema genera y lista instantáneamente cada una de las variantes hijas independientes (ej. "Buzo Oversize S Negro", "Buzo Oversize M Blanco", etc.) con sus precios heredados y stock inicial en 0.</p>
        </div>
    </div>

    <!-- PASO 3 -->
    <div class="step-card">
        <div class="step-header">
            <div class="step-number">3</div>
            <div class="step-title">Carga de Compras por Matriz / Curva de Talles (Curvero)</div>
            <div class="route-tag">/purchases</div>
        </div>
        <ol class="substeps">
            <li>Navegá en el menú lateral a <strong>Compras</strong>.</li>
            <li>Hacé clic en <strong>+ Nueva Compra</strong>.</li>
            <li>En la sección de productos, hacé clic en el botón violeta <strong>"Cargar por Matriz (Curvero)"</strong>.</li>
            <li>En el modal emergente, seleccioná el <em>Producto Padre</em> en el selector desplegable.</li>
            <li>Cargá las cantidades masivas por talle/color para ingresar la curva completa del pedido del fabricante.</li>
            <li>Hacé clic en <strong>Agregar Curva a la Compra</strong>.</li>
        </ol>
        <div class="validation-box">
            <strong>¿Qué validar?</strong>
            <p>Las líneas con cada variante se incorporan automáticamente al formulario de compra con sus cantidades sin tener que cargar prenda por prenda a mano.</p>
        </div>
    </div>

    <!-- PASO 4 -->
    <div class="step-card">
        <div class="step-header">
            <div class="step-number">4</div>
            <div class="step-title">Asignación de Vendedor en Punto de Venta (POS)</div>
            <div class="route-tag">/sales</div>
        </div>
        <ol class="substeps">
            <li>Navegá en el menú lateral a <strong>Ventas</strong> (POS).</li>
            <li>Hacé clic en <strong>+ Nueva Venta</strong>.</li>
            <li>En la barra superior del modal de venta, localizá el campo <strong>"Vendedor / Legajo"</strong>.</li>
            <li>Ingresá el nombre o código del vendedor de salón (ej. "Martina" o "VEND-01").</li>
            <li>Buscá y agregá variantes del producto al carrito y confirmá la venta.</li>
        </ol>
        <div class="validation-box">
            <strong>¿Qué validar?</strong>
            <p>La venta se registra vinculada al vendedor especificado para el cómputo de comisiones.</p>
        </div>
    </div>

    <!-- PASO 5 -->
    <div class="step-card">
        <div class="step-header">
            <div class="step-number">5</div>
            <div class="step-title">Reportes Especializados de Indumentaria & Comisiones</div>
            <div class="route-tag">/reports</div>
        </div>
        <ol class="substeps">
            <li>Navegá en el menú lateral a <strong>Reportes</strong>.</li>
            <li>En la barra de pestañas, hacé clic en la pestaña <strong>"Indumentaria & Comisiones"</strong>.</li>
            <li>Revisá las tarjetas de KPI superiores: <em>Unidades Vendidas</em>, <em>Stock Actual Total</em> y <em>Tasa de Rotación (Sell-Through %)</em>.</li>
            <li>Verificá los gráficos de <strong>Curva de Salida por Talle</strong>, <strong>Curva de Salida por Color</strong> y la tabla de <strong>Comisiones por Vendedor de Salón</strong>.</li>
        </ol>
        <div class="validation-box">
            <strong>¿Qué validar?</strong>
            <p>La pestaña muestra analíticas específicas de curvas de talles/colores y comisiones de venta sin interferir con las métricas generales del negocio.</p>
        </div>
    </div>

    <div class="note-box">
        <strong>Tip de Arquitectura:</strong> Todas estas opciones están condicionadas por el perfil <code>apparel</code> en el motor de capacidades. Si el perfil cambia a Ferretería o Kiosco, estos componentes se ocultan automáticamente.
    </div>

    <div class="footer">
        Documento generado automáticamente para QA & Validación de Usuario • NexoPOS
    </div>
</body>
</html>
    `;

    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle' });
    await page.pdf({
        path: desktopPath,
        format: 'A4',
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
        printBackground: true,
    });
    await browser.close();
    console.log(`PDF generado exitosamente en: ${desktopPath}`);
}

generatePdf().catch(console.error);
