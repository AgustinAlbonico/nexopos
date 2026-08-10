# Stock sectorizado opcional en NexoPOS

**Estado:** aprobado  
**Fecha:** 2026-08-10

NexoPOS incorporará inventario por ubicaciones físicas para comercios que necesiten distinguir el stock disponible en el salón de ventas, depósitos u otros sectores. La función será opcional: los negocios que no la activen conservarán el flujo simple actual, mientras que los que la usen tendrán cantidades operativas por ubicación y un total consolidado.

## Decisión resumida

| Tema | Decisión |
|---|---|
| Activación | Opcional por comercio, mediante un asistente guiado. |
| Fuente de verdad | En modo sectorizado, el stock total deriva de los saldos por producto y ubicación. |
| Compatibilidad | En modo simple, el inventario continúa funcionando como hoy. |
| Ubicaciones | Nombres libres con una función básica, como venta o almacenamiento. |
| Venta | Consume la ubicación principal de venta y propone una reposición si allí no alcanza. |
| Compras | Ingresan a un destino predeterminado que puede cambiarse en cada compra. |
| Traslados | Descuento y acreditación atómicos entre dos ubicaciones; no alteran el total. |
| Alertas | Se separa la necesidad de comprar de la necesidad de reponer el salón. |
| Stock existente | Al activar la función, se asigna completo a una ubicación inicial elegida. |

## Objetivos

1. Saber cuántas unidades de cada producto existen y dónde están físicamente.
2. Detectar stock alternativo cuando la ubicación de venta no puede cubrir una operación.
3. Guiar la reposición desde depósitos sin descontar mercadería de una ubicación incorrecta.
4. Prevenir quiebres en el salón mediante avisos proactivos de reposición.
5. Mantener una única fuente de verdad y un historial auditable de movimientos.
6. Evitar cualquier complejidad adicional para los comercios que usen inventario simple.

## Fuera del primer alcance

- Sucursales o almacenes con operación comercial y contabilidad independientes.
- Reservas de stock para pedidos futuros.
- Lotes, vencimientos y números de serie.
- Pasillos, estantes o posiciones exactas dentro de una ubicación.
- Picking, rutas, recepción avanzada y otras funciones de WMS.
- Mínimos de reposición diferentes por producto.
- Desactivación libre del modo sectorizado sin consolidación guiada.

## Estado actual relevante

- `Product.stock` es hoy el único saldo de existencias del producto.
- `InventoryService` registra entradas y salidas y modifica ese saldo dentro de una transacción.
- Ventas, compras, ajustes, alertas y estadísticas operan sobre el stock general.
- El sistema ya distingue el origen de los movimientos: carga inicial, compra, venta, ajuste y devolución.
- La configuración `allowOutOfStockSale` permite autorizar ventas aun cuando el saldo no alcanza.
- El mínimo global de stock se usa para avisar que un producto necesita reposición externa.

El diseño conserva el servicio de inventario como único punto de entrada para modificar existencias. No se deberán agregar cambios directos de stock desde ventas, compras u otros módulos.

## Arquitectura funcional

### Modo simple

El comportamiento actual no cambia:

- cada producto tiene un stock general;
- los movimientos incrementan o reducen ese valor;
- las validaciones y alertas consultan el total;
- ninguna pantalla solicita una ubicación.

### Modo sectorizado

Cada producto mantiene un saldo por ubicación. La suma de esos saldos constituye el stock general mostrado en productos, reportes y otras pantallas compatibles.

`Product.stock` podrá conservarse como total derivado para no romper consultas existentes, pero no será editable ni una segunda fuente de verdad. Toda operación deberá actualizar los saldos por ubicación y el total consolidado dentro de la misma transacción.

### Ubicaciones

Cada comercio podrá definir nombres que representen su estructura real, por ejemplo:

- Salón de ventas;
- Depósito trasero;
- Almacén principal;
- Cámara de frío.

Una ubicación tendrá una función básica y podrá estar activa o inactiva. El primer alcance contempla una ubicación principal que abastece ventas y un destino predeterminado para compras. Una misma ubicación podrá cumplir ambos roles.

Una ubicación con saldo o historial no se elimina. Para desactivarla, primero debe quedar sin existencias.

## Activación y compatibilidad

El asistente de activación deberá:

1. Explicar el cambio de funcionamiento.
2. Crear o seleccionar las ubicaciones iniciales.
3. Definir la ubicación principal de venta.
4. Definir el destino predeterminado de compras.
5. Elegir una ubicación para recibir todo el stock existente.
6. Asignar los saldos y activar la función dentro de una única transacción.
7. Verificar que los totales anteriores y posteriores coincidan.

La activación no exige distribuir producto por producto. El comercio podrá reorganizar el inventario después mediante traslados auditables.

No habrá un interruptor de desactivación inmediata. Una futura vuelta al modo simple deberá consolidar los saldos, advertir la pérdida del detalle operativo y confirmar que no queden operaciones inconsistentes.

## Flujos operativos

### Venta con stock disponible

1. El POS valida la cantidad en la ubicación principal de venta.
2. La venta se completa sin mostrar pasos adicionales.
3. El movimiento descuenta únicamente esa ubicación.
4. El stock total consolidado se actualiza en la misma transacción.

### Venta sin stock suficiente en la ubicación de venta

1. El POS consulta las demás ubicaciones.
2. Muestra dónde hay unidades y cuántas existen.
3. Propone trasladar la cantidad faltante hacia la ubicación de venta.
4. Si el usuario acepta, registra el traslado de forma atómica.
5. Después del traslado, vuelve a validar y completa la venta.

La acción visible será equivalente a **“Reponer y continuar”**. Si el traslado falla o el saldo cambió por otra operación, la venta no continúa automáticamente.

### Venta autorizada sin existencias

`allowOutOfStockSale` seguirá siendo una excepción explícita. Cuando esté habilitada, permitirá completar la venta aun sin saldo suficiente en la ubicación de venta, que podrá quedar negativa para visibilizar la diferencia.

Esta configuración nunca deberá descontar silenciosamente desde un almacén. Si existe stock alternativo, la opción preferente seguirá siendo registrar la reposición real.

### Compra

1. La compra propone el destino predeterminado configurado.
2. El usuario puede cambiarlo para una operación concreta.
3. Todos los ítems ingresan allí, salvo que el flujo permita indicar excepciones de forma explícita.
4. El costo y el total consolidado conservan el comportamiento actual.

Los productos nuevos con stock inicial seguirán la misma regla de destino.

### Traslado interno

Un traslado registra origen, destino, producto, cantidad, fecha y motivo. Debe descontar y acreditar dentro de una sola transacción, sin modificar el stock total del producto.

No se permitirá:

- cantidad igual o menor que cero;
- origen y destino iguales;
- una salida superior al saldo de origen;
- usar ubicaciones inactivas como destino.

### Ajustes y devoluciones

Los ajustes exigirán una ubicación cuando el modo sectorizado esté activo. Las devoluciones propondrán la ubicación de venta, pero podrán dirigirse a otra ubicación cuando la mercadería necesite revisión o almacenamiento separado.

## Alertas y pantallas

### Dos necesidades diferentes

| Alerta | Pregunta que responde | Base de cálculo |
|---|---|---|
| Compra | ¿El negocio necesita adquirir más unidades? | Stock total consolidado frente al mínimo general actual. |
| Reposición | ¿El salón necesita recibir unidades desde un depósito? | Stock de la ubicación de venta frente a un nuevo mínimo de reposición. |

El primer alcance utilizará mínimos globales. Los mínimos por producto podrán evaluarse después de observar el uso real.

### Punto de venta

El flujo normal no cambia. El aviso por ubicación aparece solamente cuando la cantidad disponible en venta no alcanza. Debe mostrar las ubicaciones alternativas y ofrecer la reposición guiada.

### Lista de reposición

La vista proactiva mostrará:

- producto;
- stock actual en venta;
- mínimo de reposición;
- stock disponible en reserva;
- ubicación de origen sugerida;
- cantidad sugerida a trasladar.

Permitirá crear traslados individuales y, si el flujo se mantiene claro, varios traslados en lote.

### Productos, inventario e historial

- Productos seguirá mostrando primero el total consolidado.
- El detalle permitirá ver el desglose por ubicación.
- Inventario podrá filtrarse por ubicación.
- El historial indicará la ubicación afectada.
- Los traslados mostrarán origen y destino como una sola operación relacionada.
- Los reportes económicos seguirán usando el total; el desglose físico pertenecerá a inventario.

## Reglas de integridad

1. En modo sectorizado, el stock total de un producto siempre equivale a la suma de sus ubicaciones.
2. Todo movimiento que afecte stock incluye una ubicación; un traslado incluye exactamente un origen y un destino.
3. Ningún módulo modifica saldos por fuera del servicio de inventario.
4. Transferencia, venta, compra, ajuste y consolidación actualizan todos sus saldos relacionados de forma atómica.
5. La disponibilidad se vuelve a validar dentro de la transacción para evitar consumos concurrentes del mismo saldo.
6. Una ubicación inactiva conserva su historial y no recibe nuevas existencias.
7. La activación conserva exactamente el stock total previo de cada producto.

## Manejo de errores

- Si otra caja consume el saldo antes de confirmar, se informa la nueva disponibilidad y se vuelve a ofrecer una alternativa.
- Si falla una reposición iniciada desde el POS, no se registra la venta como si el traslado hubiera ocurrido.
- Si el destino predeterminado de compras está inactivo, se exige seleccionar otro antes de guardar.
- Si una inconsistencia impide calcular el total, se bloquea el movimiento afectado y se registra el problema para revisión; no se corrige silenciosamente.
- Los mensajes deben distinguir entre falta de stock total y falta de stock en la ubicación de venta.

## Estrategia de pruebas

### Regresión del modo simple

- Ventas, compras, ajustes y devoluciones mantienen el comportamiento actual.
- Las pantallas no muestran campos de ubicación.
- Alertas, estadísticas y reportes conservan sus resultados.
- `allowOutOfStockSale` mantiene su semántica actual.

### Activación

- El stock existente se asigna a la ubicación elegida sin cambiar totales.
- Un fallo revierte ubicaciones, saldos y activación.
- No puede habilitarse el modo sin una ubicación principal de venta válida.

### Operaciones sectorizadas

- Venta con stock suficiente en la ubicación de venta.
- Venta con reposición aceptada, rechazada y fallida.
- Venta sin stock autorizada y no autorizada.
- Compra con destino predeterminado y destino alternativo.
- Traslado exitoso, saldo insuficiente, ubicación inactiva y concurrencia.
- Ajustes y devoluciones sobre ubicaciones concretas.
- Historial con origen y destino legibles.

### Alertas e integridad

- Diferencia entre bajo stock total y bajo stock en venta.
- Reposición sugerida solo cuando existe stock en otra ubicación.
- Total consolidado igual a la suma de saldos después de cada operación.
- Consultas y reportes existentes compatibles con el total derivado.
- Migraciones importadas cronológicamente en `apps/backend/src/migrations.ts` y test de consistencia aprobado.

## Riesgos principales

| Riesgo | Mitigación |
|---|---|
| Doble fuente de verdad | Los saldos por ubicación son operativos; el total es derivado y no editable. |
| Fricción para comercios pequeños | La función está desactivada por defecto y el modo simple no cambia. |
| Ventas descontadas desde el lugar equivocado | El POS consume la ubicación de venta y exige una reposición explícita. |
| Traslados incompletos | Origen y destino se actualizan dentro de una única transacción. |
| Saldos incorrectos por concurrencia | Validación y bloqueo del saldo dentro de la transacción. |
| Activación riesgosa | Asistente transaccional con comprobación de totales antes y después. |

## Criterios de aceptación

- [ ] Un comercio puede seguir utilizando inventario simple sin campos ni pasos nuevos.
- [ ] Un administrador puede activar el modo sectorizado sin alterar los totales existentes.
- [ ] Cada producto muestra un total y un desglose consistente por ubicación.
- [ ] Las compras ingresan al destino predeterminado y permiten cambiarlo.
- [ ] Las ventas descuentan la ubicación principal de venta.
- [ ] Si el salón no alcanza, el POS identifica stock alternativo y propone una reposición.
- [ ] Una reposición aceptada se registra antes de completar la venta.
- [ ] Los traslados no modifican el stock total y nunca quedan aplicados a medias.
- [ ] Las alertas distinguen entre necesidad de compra y necesidad de reposición interna.
- [ ] El historial permite reconstruir entradas, salidas y traslados por ubicación.
- [ ] Las ventas sin stock conservan una excepción explícita y auditable.
- [ ] Las operaciones concurrentes no consumen dos veces el mismo saldo.
- [ ] Todas las migraciones necesarias están registradas y verificadas.

## Próximo paso

Crear un plan de implementación que divida el cambio en migración y modelo de datos, servicio de inventario, integración con ventas y compras, configuración, frontend, pruebas y despliegue gradual. Ese plan debe preservar primero la regresión del modo simple antes de habilitar los nuevos flujos.
