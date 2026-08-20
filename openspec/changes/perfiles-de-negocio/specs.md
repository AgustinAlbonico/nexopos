# Especificación de Requisitos (Specs): Perfiles de Negocio y Gobernanza

**Cambio:** `perfiles-de-negocio`  
**Estado:** Especificación Completada  
**Fecha:** 2026-08-11  

---

## 1. Requisitos Funcionales (RF)

### RF-01: Reestructuración de Perfiles Técnicos
- El sistema debe soportar **7 perfiles técnicos de capacidades**:
  1. `simple-retail` (Venta Simple: Kiosco, Librería, Juguetería, Bazar, Cotillón)
  2. `hardware` (Ferretería, Pinturería)
  3. `apparel` (Indumentaria, Calzado, Mercería)
  4. `weight` (Dietética, Fiambrería, Verdulería, Granel)
  5. `expiry-tracking` (Perfumería, Cosmética, Veterinaria)
  6. `electronics` (Electrónica, Computación, Electrodomésticos, Celulares)
  7. `wholesale` (Mayorista genérico)
- Se **eliminarán** los perfiles `legacy` y `consignment` del enum y presets de backend.
- Cada tipo de negocio comercial debe estar mapeado a un único perfil técnico base.

### RF-02: Nuevas Capabilities Granulares de Eficiencia
El sistema incorporará en `keys.ts` las siguientes capacidades granulares:
- `TOOLING.blind_cash_closing`: Habilita la pantalla de cierre ciego de caja para arqueo sin visibilidad previa de saldo esperado.
- `TOOLING.park_sales`: Habilita la suspensión y recuperación de ventas en espera (multi-carrito).
- `TOOLING.quick_cash_pay`: Habilita la botonera de cobro exprés con billetes comunes y cálculo de vuelto gigante.
- `STRUCTURAL.acopio_management`: Habilita el módulo de acopios y entregas parciales por remito (Ferreterías).
- `STRUCTURAL.lazy_serial_scan`: Permite diferir la lectura de IMEI/Serial al paso final de cobro.
- `COMMERCIAL.customer_credit_limit`: Habilita el control de límite de saldo en cuentas corrientes con alerta de sobregiro.
- `COMMERCIAL.volume_discount_rules`: Habilita escalas de descuento automáticas por cantidad comprada.

### RF-03: Flujo de Onboarding Inicial
- En la primera inicialización de la aplicación (cuando `profileKey` es nulo o no configurado), el sistema debe responder `needsOnboarding: true` en la consulta del manifest/configuración.
- La interfaz del cliente debe desplegar un modal o asistente de inicio solicitando seleccionar el **Tipo de Negocio Comercial** (ej: "Kiosco").
- El envío del tipo de negocio asignará automáticamente el `profileKey` correspondiente y marcará el onboarding como completado.

### RF-04: Modo Técnico Protegido por Clave
- Las operaciones de **cambio de perfil** o **modificación individual de capacidades (overrides)** en el panel de configuración requerirán la presentación de la **Clave Técnica de Desarrollador**.
- La clave técnica por defecto se configurará mediante variable de entorno `NEXOPOS_TECHNICIAN_KEY` (con fallback de desarrollo seguro).
- Endpoint `POST /api/configuration/verify-technician-key` para validar la contraseña técnica desde la interfaz.

### RF-05: Auditoría de Integridad antes del Cambio de Perfil
- Cuando se intente cambiar el perfil de negocio (ej. de `apparel` a `simple-retail`), el backend debe ejecutar un escaneo previo de datos (`ConfigurationAuditService`).
- **Reglas de Auditoría:**
  - No se puede cambiar a un perfil sin `STRUCTURAL.variants` si existen productos con variantes activas en la base de datos.
  - No se puede cambiar a un perfil sin `STRUCTURAL.lot_expiry` si existen lotes de productos registrados.
  - No se puede cambiar a un perfil sin `STRUCTURAL.serial_warranty` si existen registros con números de serie cargados.
  - No se puede cambiar a un perfil sin `STRUCTURAL.acopio_management` si existen acopios pendientes de entrega.
- En caso de detectar incompatibilidades, la API responderá un HTTP 422 (Unprocessable Entity) detallando los registros que deben resolverse antes de cambiar el perfil.

---

## 2. Requisitos No Funcionales (RNF)

- **RNF-01 (Compatibilidad de Migración):** Toda modificación a la entidad `SystemConfiguration` debe acompañarse de su migración TypeORM y registrarse obligatoriamente en `apps/backend/src/migrations.ts`.
- **RNF-02 (Rendimiento):** El resolver de capacidades debe resolverse en memoria a partir del cache de configuración sin penalizar el tiempo de respuesta en cada request.
- **RNF-03 (Seguridad):** La clave técnica debe transmitirse de forma segura y validarse mediante hash/comparación constante en el backend.
