# Wave 2 — Resiliencia del producto local

## Hallazgos
- Restore debe ser first-class y probado; backup actual sin restore produce falsa seguridad.
- Updater en Windows debe evitar instalación vulnerable durante shutdown/logoff; conservar logs y artefacto anterior.
- Support bundle debe exportar logs, updater/backup state y diagnóstico de dispositivos sin secretos.
- Dispositivos requieren boundaries concretos: scanner HID/keyboard wedge, printer ESC/POS/OPOS, drawer vía printer kick/OPOS, scale por protocolo/vendor.
- Diferenciadores: panel de prueba de dispositivos, dry-run/test restore y update pendiente seguro.

## Fuentes
- Electron/electron-builder updater docs.
- PostgreSQL pg_dump/pg_restore docs.
- Microsoft print/POS device docs.
- ESC/POS references.

## EXPAND
- none — productization requirements saturated; exact models belong to deployment support matrix.

## CLAIMS
- A locally installed POS is not productized until restore, updater recovery, diagnostics and peripheral tests are operational.
