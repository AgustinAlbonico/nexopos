const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = 'C:/Users/agust/Desktop/Analisis_POS_Indumentaria';

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const baseStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
  
  @page {
    size: A4;
    margin: 14mm 14mm 16mm 14mm;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #1e293b;
    background: #ffffff;
    line-height: 1.5;
    font-size: 11px;
  }

  .header {
    border-bottom: 2.5px solid #2563eb;
    padding-bottom: 12px;
    margin-bottom: 16px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }

  .header-left h1 {
    font-size: 18px;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.5px;
    line-height: 1.2;
  }

  .header-left p {
    font-size: 10.5px;
    color: #64748b;
    margin-top: 4px;
    font-weight: 500;
  }

  .badge {
    display: inline-block;
    padding: 4px 9px;
    border-radius: 4px;
    font-size: 9.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .badge-blue { background: #dbeafe; color: #1d4ed8; }
  .badge-green { background: #dcfce7; color: #15803d; }
  .badge-purple { background: #f3e8ff; color: #7e22ce; }
  .badge-amber { background: #fef3c7; color: #b45309; }
  .badge-red { background: #fee2e2; color: #b91c1c; }

  h2 {
    font-size: 13.5px;
    font-weight: 700;
    color: #0f172a;
    margin-top: 14px;
    margin-bottom: 8px;
    padding-bottom: 4px;
    border-bottom: 1px solid #e2e8f0;
  }

  h3 {
    font-size: 12px;
    font-weight: 600;
    color: #334155;
    margin-top: 10px;
    margin-bottom: 6px;
  }

  p {
    margin-bottom: 8px;
    text-align: justify;
  }

  ul, ol {
    margin-left: 18px;
    margin-bottom: 10px;
  }

  li {
    margin-bottom: 3px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0;
    font-size: 10px;
  }

  th {
    background: #f1f5f9;
    color: #334155;
    font-weight: 700;
    text-align: left;
    padding: 5px 7px;
    border: 1px solid #cbd5e1;
  }

  td {
    padding: 5px 7px;
    border: 1px solid #e2e8f0;
    vertical-align: top;
  }

  tr:nth-child(even) {
    background: #f8fafc;
  }

  .card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 9px 11px;
    margin-bottom: 10px;
  }

  .card-highlight {
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 6px;
    padding: 9px 11px;
    margin-bottom: 10px;
  }

  .card-warning {
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-radius: 6px;
    padding: 9px 11px;
    margin-bottom: 10px;
  }

  .code-block {
    background: #0f172a;
    color: #f8fafc;
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    padding: 7px 9px;
    border-radius: 5px;
    margin: 7px 0;
    line-height: 1.35;
    white-space: pre-wrap;
  }

  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 8px;
  }

  .use-case-box {
    border-left: 3.5px solid #2563eb;
    background: #f8fafc;
    padding: 7px 10px;
    margin-bottom: 8px;
    border-radius: 0 4px 4px 0;
  }

  .use-case-title {
    font-weight: 700;
    color: #1e40af;
    font-size: 11px;
    margin-bottom: 3px;
  }

  .footer {
    margin-top: 16px;
    padding-top: 6px;
    border-top: 1px solid #e2e8f0;
    font-size: 8.5px;
    color: #94a3b8;
    display: flex;
    justify-content: space-between;
  }

  .page-break {
    page-break-before: always;
  }
`;

const documents = [
  {
    fileName: '1_Mapeo_Tecnico_Funcional_Dragonfish_ZooLogic.pdf',
    title: 'Mapeo Técnico y Funcional: Dragonfish / Lince (Zoo Logic)',
    badge: '<span class="badge badge-blue">Estándar de la Industria Argentina</span>',
    content: `
      <h2>1. Perfil del Sistema y Posicionamiento de Mercado</h2>
      <p><strong>Dragonfish</strong> (desarrollado por <strong>Zoo Logic</strong>) es el software de gestión y punto de venta líder absoluto en el mercado argentino de indumentaria, calzado, marroquinería y accesorios. Con más de 30 años de presencia, está instalado en más del 70% de las marcas de centros comerciales (shoppings), franquicias y cadenas multilocales del país.</p>
      
      <div class="grid-2">
        <div class="card">
          <strong>Arquitectura General:</strong>
          <ul>
            <li><strong>Núcleo POS / ERP:</strong> Aplicación de escritorio orientada a alta velocidad transaccional por teclado y lector.</li>
            <li><strong>zNube:</strong> Módulo cloud de sincronización bidireccional de stock, precios, clientes y ventas entre sucursales.</li>
            <li><strong>Base de Datos:</strong> Relacional estructurada con esquemas optimizados para matrices color/talle.</li>
          </ul>
        </div>
        <div class="card">
          <strong>Segmento Objetivo:</strong>
          <ul>
            <li>Marcas de ropa femenina, masculina, infantil y deportiva.</li>
            <li>Cadenas de zapaterías y calzado deportivo.</li>
            <li>Locales monomarca, franquicias y locales multimarca.</li>
          </ul>
        </div>
      </div>

      <h2>2. Mapeo del Modelo de Datos: Matriz Color y Talle</h2>
      <p>Dragonfish no modela una prenda como un registro plano, sino a través de una jerarquía de 3 niveles:</p>
      
      <div class="code-block">
ARTÍCULO BASE (Estilo / Modelo)
  ├── Código: [REM-045] | Descripción: "Remera Lisa Cuello Redondo"
  ├── Atributos: Marca, Temporada (PV26), Género, Rubro (Hombre), Línea (Casual)
  └── MATRIZ N x M (Paleta de Colores x Curva de Talles)
        ├── Color 01 (Negro)    -> Talles: [S] [M] [L] [XL] [XXL]
        ├── Color 02 (Blanco)   -> Talles: [S] [M] [L] [XL] [XXL]
        └── Color 03 (Azul Mar) -> Talles: [S] [M] [L] [XL] [XXL]
        => Genera 15 SKUs con Códigos de Barra Únicos (EAN-13 o Estructura Interna)
      </div>

      <table>
        <thead>
          <tr>
            <th>Concepto</th>
            <th>Implementación en Dragonfish</th>
            <th>Impacto Operativo</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Curvas de Talles</strong></td>
            <td>Escalas predefinidas (ej: "Adultos: S a XXL", "Calzado Hombre: 39 a 45", "Niños: 4 a 14").</td>
            <td>Evita escribir talles manualmente; garantiza coherencia en reportes y compras.</td>
          </tr>
          <tr>
            <td><strong>Paletas de Colores</strong></td>
            <td>Diccionario centralizado de colores con códigos y descripciones normalizadas.</td>
            <td>Evita duplicados (ej: "Negro", "Black", "Neg").</td>
          </tr>
          <tr>
            <td><strong>Estructura de SKU</strong></td>
            <td><code>[Código Art][Separador][Código Color][Separador][Código Talle]</code>.</td>
            <td>Lectura inmediata por el operador e impresoras de etiquetas.</td>
          </tr>
        </tbody>
      </table>

      <h2>3. Casos de Uso Operativos Críticos (Mostrador y Salón)</h2>

      <div class="use-case-box">
        <div class="use-case-title">CU-01: Venta Rápida por Escáner de Etiqueta Térmica (Hangtag)</div>
        <p><strong>Flujo:</strong> El cajero toma la prenda, escanea el código de barras de la etiqueta colgante. El sistema desglosa instantáneamente el artículo, su color y talle específicos, descuenta el stock de esa variante exacta y suma el precio correspondiente al ticket de venta.</p>
      </div>

      <div class="use-case-box">
        <div class="use-case-title">CU-02: Búsqueda Visual por Matriz de Stock en Vivo</div>
        <p><strong>Flujo:</strong> Si la prenda no tiene etiqueta o el cliente pide otro talle, el vendedor busca el modelo por nombre/código y presiona la tecla de función de Matriz. Se abre una grilla 2D donde las filas son los colores y las columnas los talles, mostrando en cada celda el número de unidades disponibles en el local y en otras sucursales en tiempo real.</p>
      </div>

      <div class="use-case-box">
        <div class="use-case-title">CU-03: Emisión de Ticket de Cambio / Regalo (Gift Receipt)</div>
        <p><strong>Flujo:</strong> Al finalizar la venta, el sistema ofrece imprimir el ticket fiscal y un "Ticket de Cambio" anexo. Este último contiene el código de barras identificador de la operación, detalle de prendas, fecha de emisión y política de vencimiento (ej: "Válido por 30 días para cambio"), omitiendo intencionalmente los precios abonados.</p>
      </div>

      <div class="use-case-box">
        <div class="use-case-title">CU-04: Circuito de Cambios y Devoluciones en Mostrador</div>
        <p><strong>Flujo:</strong> El cliente presenta el ticket de cambio. El cajero escanea el comprobante, selecciona el ítem a devolver (reingresando el stock al talle/color original) y escanea la nueva prenda elegida. El sistema calcula la diferencia automáticamente:
        <br/>• <em>Mismo valor:</em> Operación neutra ($0) y nuevo ticket de cambio.
        <br/>• <em>Mayor valor:</em> Cobro de la diferencia por cualquier medio de pago.
        <br/>• <em>Menor valor:</em> Emisión de <strong>Vale de Compra / Crédito</strong> con saldo a favor para futuras compras.</p>
      </div>

      <div class="use-case-box">
        <div class="use-case-title">CU-05: Asignación de Vendedores y Comisiones</div>
        <p><strong>Flujo:</strong> Permite ingresar el código de vendedor en la cabecera de la venta o por cada línea de artículo. Genera estadísticas de ventas por vendedor, prendas vendidas por hora y cálculo automatizado de comisiones.</p>
      </div>

      <div class="page-break"></div>

      <h2>4. Gestión de Compras, Curvas e Impresión de Etiquetas</h2>
      <p>Uno de los mayores diferenciales de Dragonfish radica en cómo automatiza la recepción de mercadería y su etiquetado:</p>
      
      <div class="card-highlight">
        <strong>Ingreso de Mercadería por Curvas de Compra:</strong>
        <p>Al recibir un remito de taller o proveedor, el usuario no carga unidad por unidad. Aplica una <em>Curva de Distribución</em> (ej. 1-2-2-1 para talles S-M-L-XL). Al ingresar "10 paquetes", el sistema multiplica y añade automáticamente: 10 unidades de S, 20 de M, 20 de L y 10 de XL.</p>
      </div>

      <h3>Impresión Masiva de Etiquetas Térmicas (Zebra / Xprinter / Hasar):</h3>
      <ul>
        <li><strong>Disparador Inmediato:</strong> Al confirmar un ingreso de stock, se habilita el botón <em>"Imprimir Etiquetas del Remito"</em>, enviando a la impresora térmica la cantidad exacta de etiquetas requeridas por cada variante.</li>
        <li><strong>Diseño de Etiqueta Estándar:</strong> Logo del comercio, Nombre del artículo, <strong>TALLE EN FORMATO GIGANTE</strong> (para rápida identificación en perchero/estantería), Color, Código de Barras y Precio sugerido.</li>
      </ul>

      <h2>5. Motor de Promociones Específico para Indumentaria</h2>
      <table>
        <thead>
          <tr>
            <th>Tipo de Promoción</th>
            <th>Lógica Operativa</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>2da Unidad al X%</strong></td>
            <td>Descuento automático del 50% o 70% sobre la prenda de menor valor entre las seleccionadas.</td>
          </tr>
          <tr>
            <td><strong>Packs / 3x2 en Categorías</strong></td>
            <td>La 3ra prenda bonificada al llevar 3 artículos del rubro remeras o pantalones.</td>
          </tr>
          <tr>
            <td><strong>Liquidación Fin de Temporada</strong></td>
            <td>Rebaja porcentual masiva a todos los artículos asociados a la temporada "Invierno 2025".</td>
          </tr>
          <tr>
            <td><strong>Promociones Bancarias</strong></td>
            <td>Descuento directo por medio de pago (ej. 20% off con Santander + 3 cuotas sin interés) aplicado en caja.</td>
          </tr>
        </tbody>
      </table>

      <h2>6. Análisis FODA / Puntos Fuertes y Oportunidades de Mejora</h2>
      <div class="grid-2">
        <div class="card">
          <strong style="color: #15803d;">Puntos Fuertes:</strong>
          <ul>
            <li>Cobertura funcional completa del 100% de los casos de uso textiles.</li>
            <li>Velocidad extrema de facturación y operación en mostrador.</li>
            <li>Impresión nativa impecable de etiquetas térmicas.</li>
            <li>Reconocimiento y adopción unánime por el personal de salón.</li>
          </ul>
        </div>
        <div class="card">
          <strong style="color: #b91c1c;">Puntos Débiles (Oportunidad para NexoPOS):</strong>
          <ul>
            <li>Interfaz de usuario anticuada (Windows clásico/WinForms).</li>
            <li>Complejidad alta de instalación, configuración y mantenimiento.</li>
            <li>Costos elevados de licencias mensuales y por puesto de trabajo.</li>
            <li>Integración e-commerce rígida o dependiente de conectores adicionales.</li>
          </ul>
        </div>
      </div>
    `
  },
  {
    fileName: '2_Mapeo_Tecnico_Funcional_ProCurva.pdf',
    title: 'Mapeo Técnico y Funcional: ProCurva (SaaS Textil & B2B/B2C)',
    badge: '<span class="badge badge-purple">Especialista Textil Cloud</span>',
    content: `
      <h2>1. Perfil del Sistema y Posicionamiento de Mercado</h2>
      <p><strong>ProCurva</strong> es una solución SaaS 100% web desarrollada en Rosario (Santa Fe, Argentina), diseñada específicamente para resolver los dolores de fabricantes, marcas mayoristas y locales minoristas del sector indumentaria y calzado. Su propuesta de valor se centra en el concepto de <strong>"curva textil"</strong> y en la integración nativa entre producción, preventa mayorista y punto de venta.</p>

      <div class="grid-2">
        <div class="card">
          <strong>Arquitectura General:</strong>
          <ul>
            <li><strong>Plataforma 100% Cloud:</strong> Acceso multidispositivo (PC, tablet, celular) sin instalaciones locales.</li>
            <li><strong>Portal B2B Mayorista Integrado:</strong> Catálogo privado con stock en tiempo real para clientes revendedores.</li>
            <li><strong>CRM & Bot de WhatsApp:</strong> Automatización de envíos de catálogo, estados de pedidos y confirmación de pagos.</li>
          </ul>
        </div>
        <div class="card">
          <strong>Segmento Objetivo:</strong>
          <ul>
            <li>Fabricantes de ropa con venta directa o a revendedores.</li>
            <li>Marcas con showrooms y venta mayorista/minorista híbrida.</li>
            <li>Locales comerciales que requieren gestión ágil de pedidos y stock.</li>
          </ul>
        </div>
      </div>

      <h2>2. Mapeo del Modelo de Datos: Curvas y Unidades de Venta</h2>
      <p>A diferencia de los sistemas tradicionales donde la unidad básica siempre es 1 prenda individual, en ProCurva coexisten dos unidades primarias de inventario y comercialización:</p>

      <div class="code-block">
ESTRUCTURA DE MODELO TEXTIL
  ├── Artículo Padre: [JEAN-MOM-01] "Jean Mom Rígido Celeste"
  ├── Talles: [36] [38] [40] [42] [44]
  ├── UNIDAD B2C: Unidad Suelta (Precio Minorista)
  └── UNIDAD B2B: Curva / Paquete Cerrado (Precio Mayorista)
        └── Definición de Curva: 1x(36) + 2x(38) + 3x(40) + 2x(42) + 1x(44) = 9 unidades por pack.
      </div>

      <table>
        <thead>
          <tr>
            <th>Módulo</th>
            <th>Funcionalidad Clave</th>
            <th>Beneficio Directo</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Matriz Dinámica</strong></td>
            <td>Carga visual en grilla con selector de colores agrupados y distribución de talles.</td>
            <td>Carga de colecciones enteras de 50+ artículos en minutos.</td>
          </tr>
          <tr>
            <td><strong>Venta por Bulto / Curva</strong></td>
            <td>Descuento automático de stock fraccionado al vender packs cerrados.</td>
            <td>Garantiza que el stock no quede desbalanceado con talles huérfanos.</td>
          </tr>
          <tr>
            <td><strong>Múltiples Listas de Precios</strong></td>
            <td>Lista Minorista (precio x prenda), Mayorista (curva completa), Revendedor y Especial.</td>
            <td>Cambio automático de tarifa según el tipo de cliente logueado o seleccionado.</td>
          </tr>
        </tbody>
      </table>

      <h2>3. Casos de Uso Operativos Clave</h2>

      <div class="use-case-box">
        <div class="use-case-title">CU-01: Pedido Mayorista por Matriz de Curvas en 1 Clic</div>
        <p><strong>Flujo:</strong> El cliente mayorista o vendedor entra al catálogo B2B, visualiza el artículo con sus fotos por color y selecciona: <em>"5 curvas del Color Celeste"</em>. El sistema añade 45 prendas al pedido, calculando el precio mayorista por bulto y reservando el stock de cada talle correspondiente.</p>
      </div>

      <div class="use-case-box">
        <div class="use-case-title">CU-02: Preventa de Colección / Pedidos Contra-Producción</div>
        <p><strong>Flujo:</strong> Permite lanzar una preventa de la nueva temporada sin stock físico disponible. Los clientes cargan sus pedidos por curva; el sistema consolida los totales y genera la <strong>Orden de Corte y Confección</strong> para los talleres externos.</p>
      </div>

      <div class="use-case-box">
        <div class="use-case-title">CU-03: Integración de Pedidos y Cobranzas vía WhatsApp</div>
        <p><strong>Flujo:</strong> Al confirmarse una venta o pedido mayorista, el sistema genera automáticamente un enlace de WhatsApp con el resumen de la compra desglosado por modelo/talle/color, los datos bancarios para transferencia y el enlace de seguimiento.</p>
      </div>

      <div class="use-case-box">
        <div class="use-case-title">CU-04: Gestión de Talleres Externos (Faconniers)</div>
        <p><strong>Flujo:</strong> Módulo de seguimiento de piezas enviadas a talleres (corte, confección, bordado, lavado, planchado). Control de insumos enviados (rollos de tela, avíos, cierres) y prendas terminadas recibidas.</p>
      </div>

      <div class="page-break"></div>

      <h2>4. Logística, Despacho y Envíos al Interior</h2>
      <p>En el rubro textil mayorista argentino (Flores, Once, La Salada, distritos textiles provinciales), la logística de bultos es crítica:</p>
      
      <div class="card">
        <strong>Circuito de Despacho Textil:</strong>
        <ol>
          <li><strong>Picking por Matriz:</strong> Planilla de recolección en depósito agrupada por modelo, color y curva de talles.</li>
          <li><strong>Embalaje en Bultos:</strong> Agrupación de paquetes en bolsas/cajas identificadas con número de bulto.</li>
          <li><strong>Remito de Transporte:</strong> Asignación del expreso de transporte (ej: Vía Cargo, Expreso Brio, etc.) y número de guía.</li>
        </ol>
      </div>

      <h2>5. Análisis FODA / Puntos Fuertes y Oportunidades de Mejora</h2>
      <div class="grid-2">
        <div class="card">
          <strong style="color: #15803d;">Puntos Fuertes:</strong>
          <ul>
            <li>Diseño nativo 100% pensado para la cadena de valor textil.</li>
            <li>Manejo inmejorable de curvas de fabricación y venta mayorista.</li>
            <li>Interfaz moderna, accesible desde cualquier navegador web.</li>
            <li>Integración ágil con WhatsApp para cerrar ventas.</li>
          </ul>
        </div>
        <div class="card">
          <strong style="color: #b91c1c;">Puntos Débiles (Oportunidad para NexoPOS):</strong>
          <ul>
            <li>El módulo de Punto de Venta para mostrador físico minorista es menos maduro que Dragonfish.</li>
            <li>Menor soporte para periféricos locales especializados (controladores fiscales de vieja generación, impresoras de alta velocidad de mostrador).</li>
            <li>Enfocado fuertemente en mayoristas, dejando en segundo plano las promociones complejas de retail boutique.</li>
          </ul>
        </div>
      </div>
    `
  },
  {
    fileName: '3_Mapeo_Tecnico_Funcional_DuxSoftware.pdf',
    title: 'Mapeo Técnico y Funcional: Dux Software (Módulo Indumentaria)',
    badge: '<span class="badge badge-green">ERP Omnicanal Cloud</span>',
    content: `
      <h2>1. Perfil del Sistema y Posicionamiento de Mercado</h2>
      <p><strong>Dux Software</strong> es un ERP y sistema de gestión integral en la nube con fuerte tracción en Argentina y Latinoamérica. Ofrece un módulo especializado para <strong>Indumentaria y Calzado</strong> dentro de una arquitectura centrada en la <strong>omnicanalidad</strong> y la integración con marketplaces y plataformas de comercio electrónico.</p>

      <div class="grid-2">
        <div class="card">
          <strong>Arquitectura General:</strong>
          <ul>
            <li><strong>100% Cloud SaaS:</strong> Facturación electrónica ARCA directa, multi-sucursal y multi-depósito.</li>
            <li><strong>Hub de Integraciones:</strong> Conectores bidireccionales nativos con Mercado Libre, Tiendanube, WooCommerce y Mercado Pago.</li>
            <li><strong>POS Web / Desktop:</strong> Módulo de facturación de mostrador conectado a la nube.</li>
          </ul>
        </div>
        <div class="card">
          <strong>Segmento Objetivo:</strong>
          <ul>
            <li>Comercios de ropa y calzado que venden en local físico y tienda online simultáneamente.</li>
            <li>Marcas con múltiples sucursales que requieren stock centralizado.</li>
            <li>Pymes que buscan profesionalizar su facturación y control de stock.</li>
          </ul>
        </div>
      </div>

      <h2>2. Mapeo del Modelo de Datos: Variantes y Mapeo Multicanal</h2>
      <p>El núcleo de indumentaria de Dux Software resuelve el problema de hacer coincidir los atributos locales con los esquemas de atributos de plataformas externas:</p>

      <div class="code-block">
MAPEO DE ATRIBUTOS MULTICANAL
  ├── Producto Padre: [ZAP-RUN-01] "Zapatilla Running Pro"
  │     ├── Atributo 1: Color (Negro, Gris, Azul)
  │     └── Atributo 2: Talle (39, 40, 41, 42, 43, 44)
  │
  ├── Conexión Tiendanube:
  │     └── Mapea Atributo Local "Color" -> "Color" en Tiendanube
  │     └── Mapea Atributo Local "Talle" -> "Talle" en Tiendanube
  │
  └── Conexión Mercado Libre:
        └── Mapea Atributo Local "Talle" -> ID Atributo Oficial MELI: "SIZE"
        └── Mapea Atributo Local "Color" -> ID Atributo Oficial MELI: "COLOR"
      </div>

      <table>
        <thead>
          <tr>
            <th>Capacidad</th>
            <th>Implementación en Dux</th>
            <th>Valor para el Negocio</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Sincronización de Stock en Tiempo Real</strong></td>
            <td>Descuento instantáneo en Tiendanube y Mercado Libre al vender un talle en el local físico.</td>
            <td>Elimina la sobreventa (vender una prenda que ya no existe en stock).</td>
          </tr>
          <tr>
            <td><strong>Actualización Masiva de Precios</strong></td>
            <td>Ajustes por porcentaje por marca, temporada o proveedor que impactan en todos los canales.</td>
            <td>Mantiene la rentabilidad ante variaciones de costos o inflación en minutos.</td>
          </tr>
          <tr>
            <td><strong>Multi-Depósito Sectorizado</strong></td>
            <td>Asignación de stock de variantes por sucursal física o depósito exclusivo para e-commerce.</td>
            <td>Permite reservar stock físico exclusivo para el salón de ventas.</td>
          </tr>
        </tbody>
      </table>

      <h2>3. Casos de Uso Operativos Clave</h2>

      <div class="use-case-box">
        <div class="use-case-title">CU-01: Venta en Mostrador con Búsqueda de Variantes</div>
        <p><strong>Flujo:</strong> El cajero digita el nombre o código de barra de la variante. El POS muestra el stock disponible en la sucursal actual y permite consultar si existe disponibilidad en otros depósitos de la cadena.</p>
      </div>

      <div class="use-case-box">
        <div class="use-case-title">CU-02: Generación e Impresión de Etiquetas con Códigos de Barra</div>
        <p><strong>Flujo:</strong> Permite configurar plantillas de etiquetas térmicas con el código de barra generado para cada combinación de color/talle, imprimiendo tiradas completas tras cada ingreso de mercadería.</p>
      </div>

      <div class="use-case-box">
        <div class="use-case-title">CU-03: Facturación Electrónica Masiva ARCA (AFIP)</div>
        <p><strong>Flujo:</strong> Emisión automática de Facturas A, B, C y Notas de Crédito con CAE directo en menos de 2 segundos, tanto para ventas físicas como para pedidos online recibidos.</p>
      </div>

      <div class="page-break"></div>

      <h2>4. Análisis FODA / Puntos Fuertes y Oportunidades de Mejora</h2>
      <div class="grid-2">
        <div class="card">
          <strong style="color: #15803d;">Puntos Fuertes:</strong>
          <ul>
            <li>Líder en sincronización con Mercado Libre y Tiendanube para indumentaria.</li>
            <li>Multi-sucursal y multi-depósito nativo en la nube.</li>
            <li>Facturación electrónica rápida y sin fricciones.</li>
            <li>Plataforma amigable y con soporte técnico local.</li>
          </ul>
        </div>
        <div class="card">
          <strong style="color: #b91c1c;">Puntos Débiles (Oportunidad para NexoPOS):</strong>
          <ul>
            <li>La UI del mostrador de ventas no tiene el diseño táctil ultra-ergonómico de una grilla 2D interactiva.</li>
            <li>El flujo de tickets de cambio y devoluciones en mostrador es más generalista y requiere varios clics.</li>
            <li>No incluye gestión especializada de curvas textiles de compra B2B.</li>
          </ul>
        </div>
      </div>
    `
  },
  {
    fileName: '4_Mapeo_Tecnico_Funcional_Commercy.pdf',
    title: 'Mapeo Técnico y Funcional: Commercy (POS Moderno de Moda)',
    badge: '<span class="badge badge-amber">POS de Nueva Generación</span>',
    content: `
      <h2>1. Perfil del Sistema y Posicionamiento de Mercado</h2>
      <p><strong>Commercy</strong> es una solución moderna de punto de venta y gestión comercial en la nube que ha ganado fuerte popularidad entre tiendas de indumentaria, boutiques de diseño, zapaterías y cadenas de retail en Argentina. Se destaca por una <strong>experiencia de usuario (UX) pulida</strong>, interfaces limpias e integración fluida de cobros con QR y tarjetas.</p>

      <div class="grid-2">
        <div class="card">
          <strong>Arquitectura General:</strong>
          <ul>
            <li><strong>Frontend Web & Táctil:</strong> Diseñado para operar en pantallas táctiles, tablets iPad/Android y notebooks.</li>
            <li><strong>Backend Cloud Serverless:</strong> Alta disponibilidad, copias de seguridad automáticas y actualizaciones continuas.</li>
            <li><strong>Integración de Pagos:</strong> MODO, Mercado Pago QR y terminales inteligentes.</li>
          </ul>
        </div>
        <div class="card">
          <strong>Segmento Objetivo:</strong>
          <ul>
            <li>Boutiques de moda, indumentaria femenina y tiendas de diseño.</li>
            <li>Locales de calzado y accesorios con atención estética y moderna.</li>
            <li>Comercios que priorizan una interfaz intuitiva para evitar tiempos de capacitación.</li>
          </ul>
        </div>
      </div>

      <h2>2. Mapeo del Modelo de Datos y Catálogo Visual</h2>
      <p>Commercy pone especial énfasis en la visualización del producto mediante galerías de imágenes asociadas a cada color y variantes directas:</p>

      <div class="code-block">
ESTRUCTURA VISUAL DE CATÁLOGO
  ├── Producto Padre: [VES-FIESTA-09] "Vestido Seda Estampado"
  ├── Fotos por Color: [Foto Color Rojo] | [Foto Color Esmeralda]
  ├── Matriz de Variantes:
        ├── Color Rojo -> Talle 1, Talle 2, Talle 3 (Stock por talle)
        └── Color Esmeralda -> Talle 1, Talle 2, Talle 3 (Stock por talle)
  └── Fidelización de Clientes: Perfil de compras, talles habituales y cumpleaños.
      </div>

      <table>
        <thead>
          <tr>
            <th>Área Funcional</th>
            <th>Características Destacadas</th>
            <th>Impacto en Tienda</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Punto de Venta Táctil</strong></td>
            <td>Búsqueda instantánea con imágenes de alta calidad y botones táctiles grandes.</td>
            <td>Ideal para vendedores en salón con tablets o terminales all-in-one.</td>
          </tr>
          <tr>
            <td><strong>Fidelización de Clientes</strong></td>
            <td>Registro ágil del cliente en el momento del cobro (nombre, teléfono, fecha de cumpleaños).</td>
            <td>Envío de promociones personalizadas y cupones de descuento por WhatsApp.</td>
          </tr>
          <tr>
            <td><strong>Reportes de Rendimiento</strong></td>
            <td>Métricas visuales de rotación de talles, marcas más vendidas y horarios pico de venta.</td>
            <td>Identifica rápidamente los "talles clavados" para lanzar promociones de liquidación.</td>
          </tr>
        </tbody>
      </table>

      <h2>3. Casos de Uso Operativos Clave</h2>

      <div class="use-case-box">
        <div class="use-case-title">CU-01: Venta con Cobro QR Interoperable (MODO / Mercado Pago)</div>
        <p><strong>Flujo:</strong> El cajero finaliza la venta de la prenda, selecciona "Cobro QR". Se genera un QR dinámico en pantalla con el importe exacto. El cliente escanea desde su billetera virtual, el sistema recibe la confirmación del pago en segundos y emite el ticket automáticamente.</p>
      </div>

      <div class="use-case-box">
        <div class="use-case-title">CU-02: Gestión Ágil de Tickets de Regalo / Cambio</div>
        <p><strong>Flujo:</strong> Opción con un clic para emitir ticket de cambio con diseño elegante para entregar en bolsa de regalo.</p>
      </div>

      <div class="use-case-box">
        <div class="use-case-title">CU-03: Control de Caja y Arqueo Ciego</div>
        <p><strong>Flujo:</strong> Cierre de caja ciego al final del turno donde el cajero ingresa el dinero físico contado sin ver el monto esperado, evitando desvíos y facilitando la auditoría del encargado.</p>
      </div>

      <div class="page-break"></div>

      <h2>4. Análisis FODA / Puntos Fuertes y Oportunidades de Mejora</h2>
      <div class="grid-2">
        <div class="card">
          <strong style="color: #15803d;">Puntos Fuertes:</strong>
          <ul>
            <li>Interfaz de usuario impecable, moderna y sumamente atractiva.</li>
            <li>Curva de aprendizaje prácticamente nula para nuevos cajeros.</li>
            <li>Excelente módulo de fidelización y datos de clientes.</li>
            <li>Cobro digital QR y tarjetas totalmente integrado.</li>
          </ul>
        </div>
        <div class="card">
          <strong style="color: #b91c1c;">Puntos Débiles (Oportunidad para NexoPOS):</strong>
          <ul>
            <li>Menor potencia en operaciones de compras mayoristas complejas por curvas cerradas.</li>
            <li>Personalización limitada de plantillas de etiquetas térmicas industriales.</li>
            <li>No cuenta con la profundidad de reportes contables/fiscales de un ERP completo como Dragonfish.</li>
          </ul>
        </div>
      </div>
    `
  },
  {
    fileName: '5_Comparativa_y_Gap_Analysis_NexoPOS.pdf',
    title: 'Análisis Comparativo y Gap Analysis: NexoPOS vs Mercado Nacional',
    badge: '<span class="badge badge-blue">Diagnóstico Estratégico y Hoja de Ruta</span>',
    content: `
      <h2>1. Matriz Comparativa Exhaustiva de Funcionalidades</h2>
      <p>A continuación se evalúa el estado funcional de <strong>NexoPOS</strong> frente a los cuatro referentes del mercado argentino en el rubro de indumentaria y calzado:</p>

      <table>
        <thead>
          <tr>
            <th>Funcionalidad / Capacidad</th>
            <th>Dragonfish</th>
            <th>ProCurva</th>
            <th>Dux Software</th>
            <th>Commercy</th>
            <th>NexoPOS (Actual)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Motor de Capacidades (Aislamiento por Rubro)</strong></td>
            <td>❌ Rígido</td>
            <td>❌ Solo Textil</td>
            <td>❌ Parcial</td>
            <td>❌ No</td>
            <td>✅ <strong>Excelente (Nativo)</strong></td>
          </tr>
          <tr>
            <td><strong>Modelo Padre / Variantes (Color x Talle)</strong></td>
            <td>✅ Nativo 3D</td>
            <td>✅ Nativo</td>
            <td>✅ Variantes</td>
            <td>✅ Variantes</td>
            <td>✅ <strong>Implementado (BD + API)</strong></td>
          </tr>
          <tr>
            <td><strong>Matriz 2D Visual de Carga de Productos</strong></td>
            <td>✅ Grilla</td>
            <td>✅ Grilla</td>
            <td>⚠️ Desplegables</td>
            <td>⚠️ Desplegables</td>
            <td>⚠️ <strong>Selector básico / Falta Grilla 2D</strong></td>
          </tr>
          <tr>
            <td><strong>Selector de Talle/Color con Stock en POS</strong></td>
            <td>✅ Muy Rápido</td>
            <td>⚠️ Intermedio</td>
            <td>⚠️ Lista</td>
            <td>✅ Táctil</td>
            <td>✅ <strong>ProductVariantMatrixSelector</strong></td>
          </tr>
          <tr>
            <td><strong>Emisión de Ticket de Cambio (Gift Receipt)</strong></td>
            <td>✅ Nativo</td>
            <td>⚠️ Básico</td>
            <td>⚠️ Básico</td>
            <td>✅ Nativo</td>
            <td>❌ <strong>Pendiente de desarrollo</strong></td>
          </tr>
          <tr>
            <td><strong>Circuito de Cambios y Devoluciones en Mostrador</strong></td>
            <td>✅ Muy Ágil</td>
            <td>⚠️ B2B</td>
            <td>⚠️ Manual</td>
            <td>✅ Estándar</td>
            <td>⚠️ <strong>Parcial (Devolución estándar)</strong></td>
          </tr>
          <tr>
            <td><strong>Recepción de Compras por Curvas de Talle</strong></td>
            <td>✅ Curvas</td>
            <td>✅ Curvas B2B</td>
            <td>❌ Manual</td>
            <td>❌ Manual</td>
            <td>❌ <strong>Pendiente de desarrollo</strong></td>
          </tr>
          <tr>
            <td><strong>Diseño e Impresión de Etiquetas Térmicas (Hangtags)</strong></td>
            <td>✅ Completo</td>
            <td>⚠️ Básico</td>
            <td>✅ Integrado</td>
            <td>⚠️ Básico</td>
            <td>⚠️ <strong>Parcial (TOOLING.product_labels)</strong></td>
          </tr>
          <tr>
            <td><strong>Asignación de Vendedores y Comisiones</strong></td>
            <td>✅ Avanzado</td>
            <td>⚠️ Básico</td>
            <td>✅ Estándar</td>
            <td>✅ Estándar</td>
            <td>⚠️ <strong>Auditoría básica / Falta comisiones</strong></td>
          </tr>
          <tr>
            <td><strong>Promociones Especiales (2da al 70%, 3x2, etc.)</strong></td>
            <td>✅ Avanzado</td>
            <td>⚠️ Descuentos %</td>
            <td>✅ Combos</td>
            <td>✅ Promociones</td>
            <td>⚠️ <strong>Packs / Bundles básicos</strong></td>
          </tr>
          <tr>
            <td><strong>Sincronización E-commerce (Tiendanube / ML)</strong></td>
            <td>⚠️ zNube</td>
            <td>⚠️ B2B Propio</td>
            <td>✅ Excelente</td>
            <td>✅ Buena</td>
            <td>⏳ <strong>Roadmap Futuro</strong></td>
          </tr>
        </tbody>
      </table>

      <h2>2. Diagnóstico del Estado Actual de NexoPOS</h2>
      <div class="grid-2">
        <div class="card-highlight">
          <strong style="color: #1e40af;">Fortalezas Consolidadas de NexoPOS:</strong>
          <ul>
            <li><strong>Motor de Capacidades Robusto:</strong> El perfil <code>apparel</code> permite activar/ocultar funciones dinámicamente sin contaminar otros rubros como ferretería o kiosco.</li>
            <li><strong>Modelo de Datos Avanzado:</strong> La entidad <code>Product</code> ya soporta <code>parentProductId</code>, <code>isVariantParent</code>, <code>season</code>, <code>collection</code>, <code>composition</code>, <code>careInstructions</code> y <code>returnPolicy</code>.</li>
            <li><strong>Selector de Matriz en Ventas:</strong> El componente <code>ProductVariantMatrixSelector.tsx</code> ya permite seleccionar talles y colores en el mostrador.</li>
            <li><strong>Arquitectura Moderna:</strong> Stack NestJS + React + Vite + Tailwind/Radix ultra veloz y con hot-reload.</li>
          </ul>
        </div>
        <div class="card-warning">
          <strong style="color: #b45309;">Brechas Críticas (Gaps) Identificadas:</strong>
          <ul>
            <li><strong>G-01 (Grilla 2D en Catálogo):</strong> La carga masiva de combinaciones de color y talle en el formulario de producto requiere una grilla bidimensional con navegación por <code>Tab</code>.</li>
            <li><strong>G-02 (Tickets de Cambio y Devoluciones):</strong> Falta el comprobante formal de regalo sin precios y el modal de cambio ágil en mostrador (prenda devuelta + prenda nueva en 1 paso).</li>
            <li><strong>G-03 (Curvas de Compra):</strong> En compras, falta poder aplicar plantillas de curva (ej: 1-2-2-1) para auto-llenar stock.</li>
            <li><strong>G-04 (Etiquetado Térmico para Ropa):</strong> Formato de etiquetas colgantes con talle gigante y código de barras por variante.</li>
          </ul>
        </div>
      </div>

      <div class="page-break"></div>

      <h2>3. Hoja de Ruta y Plan de Implementación para NexoPOS</h2>
      <p>Para posicionar a NexoPOS como el sistema POS de indumentaria más moderno y ergonómico del mercado argentino, se recomienda ejecutar el siguiente plan por fases:</p>

      <div class="use-case-box">
        <div class="use-case-title">Fase 1: Ergonomía de Catálogo y Matriz Bidimensional 2D (Prioridad Alta)</div>
        <ul>
          <li><strong>Componente ProductVariantMatrixGrid.tsx:</strong> Grilla interactiva en el formulario de productos donde las columnas son talles (ej. S, M, L, XL) y las filas colores. El usuario ingresa stock inicial y precios navegando con <code>Tab</code>.</li>
          <li><strong>Plantillas de Talles Rápidas:</strong> Chips de acceso directo: <em>"Adultos (S a XXL)"</em>, <em>"Calzado (36 a 45)"</em>, <em>"Niños (4 a 14)"</em>, <em>"Pantalones (38 a 54)"</em>.</li>
        </ul>
      </div>

      <div class="use-case-box">
        <div class="use-case-title">Fase 2: Circuito de Ticket de Cambio y Operación en Mostrador (Prioridad Alta)</div>
        <ul>
          <li><strong>Emisión de Ticket de Cambio:</strong> Botón en el checkout para imprimir ticket de cambio con QR/Código de barras único, omitiendo precios y fijando 30 días de vigencia.</li>
          <li><strong>Modal de Cambio Rápido en POS:</strong> Al escanear un ticket de cambio, el sistema carga el ítem original a devolver, permite escanear la prenda de reemplazo y liquida la diferencia automáticamente (a cobrar o generando Vale de Crédito).</li>
        </ul>
      </div>

      <div class="use-case-box">
        <div class="use-case-title">Fase 3: Curvas de Compra e Impresión Térmica de Etiquetas (Prioridad Media)</div>
        <ul>
          <li><strong>Curvas en Módulo de Compras:</strong> Aplicación de curvas porcentuales o numéricas (1-2-2-1) al recibir bultos de mercadería.</li>
          <li><strong>Impresión Térmica de Hangtags:</strong> Generador de etiquetas para impresoras Zebra/Xprinter con código de barras de variante, color y <strong>TALLE RESALTADO</strong> en formato grande.</li>
        </ul>
      </div>

      <div class="use-case-box">
        <div class="use-case-title">Fase 4: Vendedores, Comisiones y Promociones Textiles (Prioridad Media/Baja)</div>
        <ul>
          <li>Asignación de vendedor por ítem o ticket y reporte mensual de comisiones.</li>
          <li>Reglas de promoción textil: 2da unidad al 70%, 3x2 en rubros seleccionados y liquidaciones de fin de temporada.</li>
        </ul>
      </div>

      <div class="card" style="margin-top: 15px;">
        <strong>Conclusión Estratégica:</strong>
        <p>NexoPOS cuenta con una base arquitectónica impecable y muy superior tecnológicamente a Dragonfish y Lince. Implementando la <strong>Matriz 2D de Carga</strong>, el <strong>Circuito de Tickets de Cambio</strong> y el <strong>Etiquetado Térmico</strong>, NexoPOS ofrecerá una experiencia de usuario insuperable para tiendas de ropa, calzado y boutiques, combinando la robustez de un sistema especializado con la agilidad y belleza de una plataforma web moderna.</p>
      </div>
    `
  }
];

async function generateAllPdfs() {
  console.log('Iniciando generador de PDFs con Chromium...');
  const browser = await chromium.launch();

  for (const doc of documents) {
    const filePath = path.join(OUTPUT_DIR, doc.fileName);
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>${doc.title}</title>
        <style>${baseStyles}</style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <h1>${doc.title}</h1>
            <p>Informe Técnico de Investigación y Benchmarking para NexoPOS</p>
          </div>
          <div>${doc.badge}</div>
        </div>
        ${doc.content}
        <div class="footer">
          <span>NexoPOS System Architecture & Product Research</span>
          <span>Fecha: 18 de Agosto de 2026</span>
        </div>
      </body>
      </html>
    `;

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle' });
    await page.pdf({
      path: filePath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '14mm',
        right: '14mm',
        bottom: '16mm',
        left: '14mm',
      },
    });
    await page.close();
    console.log(`Generado: ${doc.fileName}`);
  }

  await browser.close();
  console.log('Todos los PDFs fueron generados exitosamente en ' + OUTPUT_DIR);
}

generateAllPdfs().catch(err => {
  console.error('Error generando PDFs:', err);
  process.exit(1);
});
