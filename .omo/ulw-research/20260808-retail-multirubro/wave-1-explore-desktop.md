# Wave 1 — Desktop y productización

## Hallazgos
- Electron/NSIS x64 inicia backend local, PDF server, updater y setup PostgreSQL.
- Scanner keyboard-wedge está implementado; impresora, balanza y cajón no tienen bridges nativos.
- Backup crea/lista/elimina, pero no existe restauración en API/UI.
- No hay tests desktop específicos para setup/updater/restore.
- Documentación contiene drift de rutas y nombre de DB.

## EXPAND
- LEAD: restore workflow and update-safe diagnostics — WHY: sellable local product requires recovery — ANGLE: backup restore, installer smoke tests, hardware diagnostics.
- LEAD: scale/printer/cash-drawer support — WHY: retail differentiator — ANGLE: Electron device bridge boundaries.

## CLAIMS
- Current packaged product is Windows-only and scanner support is the only real peripheral integration.
