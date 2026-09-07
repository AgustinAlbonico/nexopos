# Documentación de NexoPOS

Índice completo de la documentación del sistema de gestión NexoPOS Desktop.

## 🚀 Inicio Rápido

**¿Primera vez?** Lee estos documentos en orden:

1. **[REQUISITOS-SISTEMA.md](./REQUISITOS-SISTEMA.md)** - Qué necesitas para ejecutar el sistema
2. **[tecnica/guia-instalacion.md](./tecnica/guia-instalacion.md)** - Cómo instalar y configurar
3. **[planificacion-nexopos.md](./planificacion-nexopos.md)** - Visión general del proyecto

## 📚 Documentación por Categoría

### Instalación y Configuración

| Documento | Descripción | Audiencia |
|-----------|-------------|-----------|
| **[REQUISITOS-SISTEMA.md](./REQUISITOS-SISTEMA.md)** | Requisitos de hardware, software y dependencias | Desarrolladores y usuarios |
| **[DEPENDENCIAS-INSTALADOR.md](./DEPENDENCIAS-INSTALADOR.md)** | Dependencias del instalador de Electron | Desarrolladores |
| **[tecnica/guia-instalacion.md](./tecnica/guia-instalacion.md)** | Guía paso a paso de instalación | Usuarios finales |
| **[tecnica/GUIA-MIGRACION-DESKTOP.md](./tecnica/GUIA-MIGRACION-DESKTOP.md)** | Migración de web a desktop | Desarrolladores |

### Desarrollo y Mantenimiento

| Documento | Descripción | Audiencia |
|-----------|-------------|-----------|
| **[INSTRUCTIVO_ACTUALIZACIONES.md](./INSTRUCTIVO_ACTUALIZACIONES.md)** | Cómo actualizar el sistema | Desarrolladores |
| **[tecnica/guia-actualizaciones.md](./tecnica/guia-actualizaciones.md)** | Proceso técnico de actualizaciones | Desarrolladores |
| **[analisis-mejoras-pos.md](./analisis-mejoras-pos.md)** | Análisis de mejoras del sistema | Product Manager |

### Integración AFIP

| Documento | Descripción | Audiencia |
|-----------|-------------|-----------|
| **[tecnica/guia-certificados-arca.md](./tecnica/guia-certificados-arca.md)** | Generación de certificados AFIP | Administradores |
| **[estudio-mercado/03-requisitos-fiscales.md](./estudio-mercado/03-requisitos-fiscales.md)** | Requisitos fiscales argentinos | Product Manager |

### Planificación y Estrategia

| Documento | Descripción | Audiencia |
|-----------|-------------|-----------|
| **[planificacion-multirubro-completa.md](./planificacion-multirubro-completa.md)** | Investigación y planificación completa de perfiles, funcionalidades y roadmap multi-rubro | Business / Producto / Desarrollo |
| **[plan-pos-multirubro.md](./plan-pos-multirubro.md)** | Plan breve para convertir NexoPOS en un producto configurable para distintos comercios | Business / Producto |
| **[planificacion-nexopos.md](./planificacion-nexopos.md)** | Planificación general del proyecto | Todos |
| **[plan-distribucion.md](./plan-distribucion.md)** | Plan de distribución del software | Business |

### Estudio de Mercado

| Documento | Descripción | Audiencia |
|-----------|-------------|-----------|
| **[estudio-mercado/01-analisis-competitivo.md](./estudio-mercado/01-analisis-competitivo.md)** | Análisis de competidores | Product Manager |
| **[estudio-mercado/02-analisis-precios.md](./estudio-mercado/02-analisis-precios.md)** | Estrategia de precios | Business |
| **[estudio-mercado/04-funcionalidades-criticas.md](./estudio-mercado/04-funcionalidades-criticas.md)** | Features críticas | Product Manager |
| **[estudio-mercado/05-verticales-oportunidad.md](./estudio-mercado/05-verticales-oportunidad.md)** | Verticales de mercado | Business |
| **[estudio-mercado/06-tendencias-2025.md](./estudio-mercado/06-tendencias-2025.md)** | Tendencias del mercado | Todos |
| **[estudio-mercado/07-canales-distribucion.md](./estudio-mercado/07-canales-distribucion.md)** | Canales de distribución | Marketing |
| **[estudio-mercado/08-conclusiones-recomendaciones.md](./estudio-mercado/08-conclusiones-recomendaciones.md)** | Conclusiones y recomendaciones | Todos |
| **[estudio-mercado/09-estrategia-diferenciacion.md](./estudio-mercado/09-estrategia-diferenciacion.md)** | Estrategia de diferenciación | Business |

## 🎯 Casos de Uso Comunes

### "Quiero instalar NexoPOS en mi negocio"

**Requisitos**: Solo PostgreSQL 14+ (Node.js está incluido en el instalador)

1. Instala PostgreSQL
2. Crea la base de datos `nexopos`
3. Descarga y ejecuta `NexoPOS-Setup-1.0.4.exe`
4. Completa el Setup Wizard

**¡Listo!** - Si tienes dudas: [tecnica/guia-instalacion.md](./tecnica/guia-instalacion.md)

### "Quiero desarrollar/modificar NexoPOS"

1. Lee [REQUISITOS-SISTEMA.md](./REQUISITOS-SISTEMA.md) → Sección "Desarrollo"
2. Instala Node.js y PostgreSQL
3. Clona el repositorio
4. Sigue la sección "Setup Inicial" en [REQUISITOS-SISTEMA.md](./REQUISITOS-SISTEMA.md)
5. Para build del instalador: [DEPENDENCIAS-INSTALADOR.md](./DEPENDENCIAS-INSTALADOR.md)

### "Quiero actualizar el sistema"

1. Lee [INSTRUCTIVO_ACTUALIZACIONES.md](./INSTRUCTIVO_ACTUALIZACIONES.md)
2. Para detalles técnicos: [tecnica/guia-actualizaciones.md](./tecnica/guia-actualizaciones.md)

### "Necesito configurar facturación electrónica"

1. Lee [tecnica/guia-certificados-arca.md](./tecnica/guia-certificados-arca.md)
2. Genera certificados en AFIP
3. Coloca certificados en la carpeta correcta
4. Configura variables en `.env`

### "Tengo un error 'Cannot find module'"

1. Lee [DEPENDENCIAS-INSTALADOR.md](./DEPENDENCIAS-INSTALADOR.md) → Sección "Troubleshooting"
2. Ejecuta `node scripts/copy-backend-deps.js`
3. Reconstruye el instalador

## 🛠️ Arquitectura del Sistema

```
NexoPOS Desktop
├── Frontend (React + Vite + TypeScript)
│   ├── UI Components (shadcn/ui)
│   ├── State Management (Zustand)
│   └── API Client (React Query)
│
├── Backend (NestJS + TypeScript)
│   ├── API REST
│   ├── TypeORM + PostgreSQL
│   └── Servicios de negocio
│
└── Desktop (Electron 30)
    ├── Main Process (Node.js)
    ├── Renderer Process (React)
    ├── Auto-updater
    └── PDF Generator
```

**Para más detalles**: Ver [planificacion-nexopos.md](./planificacion-nexopos.md)

## 📋 Stack Tecnológico

| Capa | Tecnología | Versión |
|------|------------|---------|
| **Frontend** | React | 18.x |
| | TypeScript | 5.3.x |
| | Vite | 5.x |
| | Tailwind CSS | 3.x |
| | shadcn/ui | Latest |
| **Backend** | NestJS | 10.x |
| | TypeORM | 0.3.x |
| | PostgreSQL | 14+/15+/16+ |
| **Desktop** | Electron | 30.x |
| | electron-builder | 24.x |
| **DevOps** | Turborepo | 2.x |
| | npm workspaces | - |

## 🐛 Troubleshooting

### Problemas Comunes y Soluciones Rápidas

| Problema | Solución | Documento |
|----------|----------|-----------|
| Error "Cannot find module" | Regenerar dependencias | [DEPENDENCIAS-INSTALADOR.md](./DEPENDENCIAS-INSTALADOR.md) |
| No conecta a PostgreSQL | Verificar servicio y credenciales | [REQUISITOS-SISTEMA.md](./REQUISITOS-SISTEMA.md#troubleshooting) |
| Puerto 3000 ocupado | Cambiar puerto en .env | [REQUISITOS-SISTEMA.md](./REQUISITOS-SISTEMA.md#troubleshooting) |
| Instalador no inicia | Verificar Windows Defender | [REQUISITOS-SISTEMA.md](./REQUISITOS-SISTEMA.md#troubleshooting) |
| Pantalla blanca en Electron | Verificar frontend build | [REQUISITOS-SISTEMA.md](./REQUISITOS-SISTEMA.md#troubleshooting) |

## 🔄 Flujo de Trabajo

### Desarrollo

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar .env
cp env.template .env
# Editar .env con tus datos

# 3. Ejecutar migraciones
npm run migration:run --workspace=@sistema/backend

# 4. Ejecutar en desarrollo
npm run dev

# 5. Ejecutar tests
npm run test
```

### Build de Producción

```bash
# Desde apps/desktop/
npm run build

# Resultado: release/NexoPOS-Setup-1.0.4.exe
```

## 📞 Soporte

**Desarrollador**: Agustín Albonico  
**Repositorio**: [github.com/AgustinAlbonico/sistema-gestion](https://github.com/AgustinAlbonico/sistema-gestion)  
**Issues**: [github.com/AgustinAlbonico/sistema-gestion/issues](https://github.com/AgustinAlbonico/sistema-gestion/issues)

## 📝 Contribuir

Para contribuir al proyecto:

1. Fork del repositorio
2. Crear rama de feature (`git checkout -b feature/AmazingFeature`)
3. Commit de cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📄 Licencia

**UNLICENSED** - Propietario: Agustín Albonico

---

**Última actualización**: 22 de diciembre de 2024  
**Versión de NexoPOS**: 1.0.4

