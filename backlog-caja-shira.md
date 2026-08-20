# Backlog Jira — Módulo Caja

> Backlog de mejoras identificadas para el módulo de Caja (Cash Register).
> Cada ticket está listo para crear en Jira (copiar el bloque "Issue Body" en el
> campo descripción). Project Key: `POS` (sugerido, ajustar al real).
> Etiqueta sugerida: `modulo/caja`, `prioridad/media`.

### Contexto del repo (CodeGraph)

- **Controller actual:** `apps/backend/src/modules/cash-register/cash-register.controller.ts`
  - Endpoints existentes: `open`, `close`, `reopen`, `getCurrent`, `getStatus`,
    `createMovement`, `getCashFlowReport`, `getHistory`, `getStats`,
    `getSuggestedInitial`, `findOne`.
  - Auth: `JwtAuthGuard` (`apps/backend/src/modules/auth/guards/jwt-auth.guard`).
  - El request trae `userId` desde el JWT (vía `req.user.userId`).
  - ⚠️ **No hay tests** sobre el controller ni el service de caja
    (gap detectado al auditar el blast radius).

---

## SHIRA-XX — [Caja] Soporte para múltiples turnos por día (Mañana / Tarde / Cajero)

### 🎯 Problema / Necesidad
El backend limita la apertura de caja a una sola sesión por fecha local
(`date = today`). En negocios con turno cortado (mañana/tarde) o con cambio de
cajero a mitad del día, la lógica actual obliga a reabrir la misma caja o
compartirla entre varios usuarios, lo cual rompe la trazabilidad de quién
movió qué plata.

### ✅ Criterios de Aceptación
- [ ] El sistema permite abrir más de una sesión de caja en la misma fecha local.
- [ ] Cada sesión queda asociada a un **usuario cajero** y un **número de turno**
      (`shiftNumber` o `turn = morning | afternoon | night`).
- [ ] El listado de cajas abiertas muestra cajero + turno + horario.
- [ ] Las ventas y movimientos de caja se vinculan al `cashSessionId` correcto
      (no a la fecha).
- [ ] Migración compatible con sesiones existentes (backfill: asignar turno
      `morning` a las cajas pre-existentes del día).
- [ ] Tests unitarios del servicio de caja cubriendo los casos de múltiples
      sesiones por día.

### 🛠️ Especificación Técnica
- **Base de Datos / Migraciones:**
  - Tabla `cash_register_sessions` (o equivalente): agregar columna
    `user_id INT NOT NULL`, `shift_number SMALLINT NOT NULL`
    o `shift_type ENUM('morning','afternoon','night')`.
  - Crear índice único compuesto `(local_date, user_id, shift_type)`.
  - Revisar FKs de `sales` / `cash_movements` para apuntar a `session_id`
    en vez de fecha.
- **Backend (NestJS):**
  - `CashRegisterService.open()`: aceptar `userId` + `shift` en el DTO.
    (El `userId` ya viene en el JWT; solo hay que persistirlo y exponerlo.)
  - Quitar (o suavizar) la constraint de "una caja por fecha".
  - Exponer en el listado de cajas: `{ date, user, shift, openedAt, status }`.
- **Frontend (React/Vite):**
  - `OpenCashDialog`: agregar selector de turno (Mañana / Tarde / Noche).
  - Listado de cajas abiertas: agregar columna "Cajero" y "Turno".

### ⛔ Fuera de Alcance
- Sistema de login/auth de cajeros (se asume ya existe y provee `userId`).
- Liquidación de sueldos o cálculo de comisiones por turno.
- Cierre forzoso automático por horario.

---

## SHIRA-XX — [Caja] Arqueo "a ciegas" para cajeros (Blind Close)

### 🎯 Problema / Necesidad
El diálogo de cierre (`CloseCashDialog`) autocompleta el monto esperado por
defecto. Esto induce al cajero a confirmar sin contar realmente el efectivo,
invalidando el arqueo como control. Para cajeros, el monto declarado debe
ser siempre ingreso manual; la diferencia esperada solo es visible para
supervisor/admin.

### ✅ Criterios de Aceptación
- [ ] Si el rol del usuario es **Cajero**, el input "Efectivo declarado" arranca
      vacío y el "Monto esperado" NO se muestra (ni siquiera deshabilitado).
- [ ] Si el rol es **Supervisor** o **Admin**, el campo "Monto esperado" se
      sigue mostrando como referencia.
- [ ] El cálculo de diferencia se hace igual para ambos roles, pero solo
      Supervisor/Admin ven el valor numérico en el resultado.
- [ ] El cajero igual puede ver su propio arqueo luego de cerrar (modo
      resumen), pero NO antes de confirmarlo.
- [ ] El backend rechaza/forza a `declaredAmount` distinto de `expectedAmount`
      en el rol cajero (no permitir enviar el esperado en el payload).

### 🛠️ Especificación Técnica
- **Base de Datos / Migraciones:** sin cambios (es control de UI/rol).
- **Backend (NestJS):**
  - `CashRegisterService.close()`: leer rol desde JWT/guard.
  - Si rol es cajero, ignorar `declaredAmount` enviado por el front si
    coincide con `expectedAmount` (defensa adicional).
  - La respuesta puede incluir `expectedAmount` y `difference` solo si el
    rol lo permite (no leak por API).
- **Frontend (React/Vite):**
  - `CloseCashDialog`: recibir rol desde store/auth.
  - Ocultar campo "Esperado" cuando `role === 'cajero'`.
  - No auto-completar `declaredAmount` para cajeros.
  - Mostrar diferencia solo a supervisor/admin.

### ⛔ Fuera de Alcance
- Cambios en la lógica de cálculo del esperado (se mantiene).
- Bloqueo físico al cajero de cerrar sin ARCHIVO firmado (eso es otro ticket).
- Reportes históricos de arqueos ciegos.

---

## SHIRA-XX — [Caja] Concepto explícito de "Sangría" / Retiro a Tesorería (CASH_DROP)

### 🎯 Problema / Necesidad
Existen movimientos manuales de efectivo pero no están categorizados. Un
retiro de seguridad a caja fuerte (cuando se junta mucho efectivo en el cajón)
se confunde con un gasto operativo. Esto distorsiona el resultado del cierre
y complica la rendición a tesorería.

### ✅ Criterios de Aceptación
- [ ] Nuevo tipo de movimiento: `CASH_DROP` (sangría / retiro a tesorería).
- [ ] Diferenciar visualmente en la UI: gasto operativo vs. sangría.
- [ ] El reporte de cierre de caja separa:
      - Ventas
      - Gastos operativos
      - Sangría
      - Sobrante / faltante de efectivo
- [ ] Las sangrías requieren un campo opcional `destination` (ej: "Caja fuerte",
      "Tesorería").
- [ ] Auditoría: toda sangría queda registrada con usuario, hora, monto y
      motivo.
- [ ] Migración enum (o columna `type`) compatible con valores previos.

### 🛠️ Especificación Técnica
- **Base de Datos / Migraciones:**
  - Tabla `cash_movements` (o equivalente): cambiar columna `type` a enum
    que incluya `CASH_DROP` (o nuevo valor `WITHDRAWAL` vs `EXPENSE`).
  - Agregar columna `destination VARCHAR(120) NULL`.
  - Migración con default para registros existentes: mapear valores previos
    a `EXPENSE` o `MANUAL_ADJUSTMENT`.
  - Registrar en `apps/backend/src/migrations.ts` (regla obligatoria del
    repo).
- **Backend (NestJS):**
  - `CashMovement` entity: nuevo enum.
  - `CashRegisterService.registerMovement()`: aceptar `destination` para
    `CASH_DROP`.
  - `CloseCashReport`: agregar sección de sangrías.
- **Frontend (React/Vite):**
  - `CashMovementDialog`: agregar opción "Sangría / Retiro a tesorería" en el
    selector de tipo.
  - Mostrar campo "Destino" cuando el tipo es `CASH_DROP`.
  - Reporte de cierre: nueva sección "Sangrías" antes del resultado final.

### ⛔ Fuera de Alcance
- Integración con módulo de Tesorería (solo se registra el destino como texto).
- Workflow de aprobación de sangrías (queda para otro ticket).
- Conciliación bancaria.

---

## SHIRA-XX — [Caja] Impresión de Ticket de Cierre (Resumen Z) para tiquetera 80mm/58mm

### 🎯 Problema / Necesidad
El reporte de cierre de caja está disponible en pantalla, pero no tiene un
formato imprimible en tiquetera térmica (80mm/58mm). Los negocios necesitan
abrochar el resumen al sobre con el dinero antes de rendir la caja. Sin esto,
el cierre queda en el sistema y se pierde trazabilidad física.

### ✅ Criterios de Aceptación
- [ ] Botón "Imprimir Ticket de Cierre" visible al confirmar el arqueo.
- [ ] Layout optimizado para 80mm (por defecto) y 58mm (alternativo).
- [ ] El ticket contiene: comercio, fecha, cajero, turno, monto inicial,
      ventas, gastos, sangrías, efectivo esperado, declarado, diferencia,
      y línea para firma del cajero y supervisor.
- [ ] No usar librería de PDFs externa; renderizar HTML + `window.print()`
      con CSS `@media print` (lazy: lo que ya existe en el repo).
- [ ] Si no hay tiquetera configurada, abrir diálogo de impresión estándar
      del SO (no romper).
- [ ] Tests: snapshot del HTML generado (o al menos verificación de campos
      clave).

### 🛠️ Especificación Técnica
- **Base de Datos / Migraciones:** sin cambios.
- **Backend (NestJS):**
  - Endpoint nuevo: `GET /cash-register/sessions/:id/close-summary` que
    devuelve la data ya consolidada (si no existe, agregarlo en
    `CashRegisterService`).
- **Frontend (React/Vite):**
  - `CloseCashDialog`: agregar botón "Imprimir Ticket" después de cerrar.
  - Nuevo componente `CashCloseTicket.tsx` (oculto en pantalla, visible al
    imprimir).
  - CSS `@page { size: 80mm auto; margin: 4mm; }` y media query `@media print`.
  - Reutilizar el formateo de moneda del sistema (no reinventar).

### ⛔ Fuera de Alcance
- Driver nativo de tiquetera (se usa el diálogo del SO).
- Logo / membrete personalizado por comercio (queda para config general).
- Re-impresión con numeración correlativa (ID de sesión como referencia).
- Envío del ticket por email o WhatsApp.

---

## 📋 Metadata de los tickets

| # | Resumen | Tipo sugerido | Prioridad sugerida |
|---|---------|---------------|--------------------|
| 1 | [Caja] Soporte para múltiples turnos por día | Story | Media |
| 2 | [Caja] Arqueo "a ciegas" para cajeros (Blind Close) | Story | Alta |
| 3 | [Caja] Concepto de "Sangría" / Retiro a Tesorería (CASH_DROP) | Story | Media |
| 4 | [Caja] Impresión de Ticket de Cierre (Resumen Z) | Story | Baja |

## 🏷️ Labels sugeridas

- `modulo/caja`
- `area/operaciones`
- `release/mvp-caja-v2`

## 🔗 Dependencias detectadas

- Ticket 1 (turnos) **bloquea** parcialmente al Ticket 2 (el arqueo ciego
  debería correr sobre la sesión correcta: cajero + turno).
- Ticket 3 (sangría) impacta el reporte del Ticket 4 (ticket de cierre).
- Ticket 4 puede implementarse de forma independiente al resto.

> Sugerencia de orden de implementación: **2 → 1 → 3 → 4**.
