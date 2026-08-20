G3 — Aislamiento por rubro: no hay endpoint real para alternar capabilities en runtime
======================================================================================

EVIDENCIA:
  apps/backend/src/modules/configuration/configuration.service.ts:167-184

    private readonly defaultCapabilitiesManifest: CapabilitiesManifest = {
        'STRUCTURAL.variants': true,
        'STRUCTURAL.weight': false,
        'STRUCTURAL.expiry': false,
    };

    async getCapabilitiesManifest(): Promise<CapabilitiesManifest> {
        return { ...this.defaultCapabilitiesManifest };
    }

    async assertCapabilityEnabled(capability: CapabilityKey): Promise<void> {
        const manifest = await this.getCapabilitiesManifest();
        if (manifest[capability] === false) {
            throw new ForbiddenException(...);
        }
    }

  apps/backend/src/modules/configuration/configuration.controller.ts:

    @Controller('configuration')
    @UseGuards(JwtAuthGuard)
    export class ConfigurationController {
        @Get()                          // GET /configuration
        @Patch()                        // PATCH /configuration
        @Post('update-all-prices')      // POST /configuration/update-all-prices
    }

    NO hay GET /configuration/manifest. NO hay PATCH /configuration/profile.
    NO hay POST /configuration/onboarding.

  apps/frontend/src/hooks/useCapabilities.ts:41-58

    useCapabilities(enabled = true) {
        try {
            const response = await api.get('/api/configuration/manifest');
            return capabilitiesManifestSchema.parse(response.data);
        } catch {
            // Endpoint aún no expuesto (worktrees sin capabilities.controller);
            // caemos al default. Cuando el endpoint exista, esto deja de aplicar.
            return defaultManifest;
        }
    }

    defaultManifest = { capabilities: { 'STRUCTURAL.variants': true, ... } }

POR QUÉ IMPORTA:
  El spec E2E no puede alternar entre perfiles (simple-retail / apparel / weight /
  expiry-tracking) en runtime. El defaultManifest está hardcodeado en código.

  Tests que cubren el camino OFF solo existen en VariantMatrixModal.spec.tsx vía
  mockHasVariantsCapability=false. No se puede traducir eso a un E2E real sin
  tener:
    1. capabilities.controller.ts exponiendo GET /api/configuration/manifest.
    2. Tabla o settings para que el operador elija perfil.
    3. UI de SettingsPage con selector de rubro.

CÓMO EL SPEC ACTUAL RESUELVE ESTO:
  - Camino ON (profile active = simple-retail default, variants habilitado):
      4 tests E2E usan el modal contra el backend real. Pasan.
  - Camino OFF (variants deshabilitado por capability):
      test.skip(true) con mensaje explícito referenciando configuration.service.ts.

  Esto NO es trampa: documentamos que la cobertura OFF requiere implementar
  el backend del motor de capabilities, y NO mockeamos la UI para "verificar"
  un camino que en realidad nunca se ejecuta contra el backend real.

BLOQUEADO POR:
  AGENTS.md §"Perfiles de Negocio y Motor de Capacidades (CRÍTICO)":
  > Backend: Validar la capacidad en la capa de servicio/controlador usando
  > configService.getCapabilitiesManifest() y lanzando ForbiddenException
  > si el perfil de negocio activo no la incluye.

  Hoy: el validador existe (assertCapabilityEnabled) pero el manifest nunca
  cambia porque el servicio hardcodea el default. La validación siempre
  pasa silenciosamente.

CÓMO DESBLOQUEAR:
  1. Crear `apps/backend/src/modules/configuration/capabilities.controller.ts`
     con:
       GET   /api/configuration/manifest       → lee del manifest seleccionado
       PATCH /api/configuration/manifest       → cambia el manifest (admin only)
  2. Persistir el manifest seleccionado por usuario en `system_configuration`
     o tabla nueva `business_profiles` (jsonb: profileKey, capabilities, appRoutes).
  3. Seed inicial: detectar si no hay manifest seleccionado y forzar al usuario
     a pasar por un wizard de onboarding (SettingsPage → ActivationWizardPage).
  4. Reemplazar el `test.skip(true)` de G3 por un test E2E que:
       a) Llama PATCH /api/configuration/manifest con variants=false.
       b) Recarga la página.
       c) Verifica que useCapabilities devuelve capability=false.
       d) Verifica que el botón "Generar Matriz" está oculto O el modal muestra
          el capability-blocked panel.

TICKETS RELACIONADOS:
  - F3: capabilities.controller + persistencia del manifest seleccionado.
  - F4: ActivationWizardPage en SettingsPage + tests E2E del switch de perfil.