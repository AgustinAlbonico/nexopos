---
name: jira-manager
description: "Trigger: jira, crear tarea jira, ticket jira, backlog jira, issue jira. Estructura y crea tareas profesionales en Jira mediante MCP."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## Activation Contract

Use this skill whenever the user asks to create, organize, refine, or update tasks, user stories, or bugs in Jira.

## Hard Rules

- Always format Jira descriptions using clean Markdown / Atlassian formatting.
- Issue Summary MUST follow the pattern: `[Módulo] Nombre conciso de la tarea`.
- Every task description MUST contain:
  1. **Contexto / Problema**: 1-2 oraciones del motivo.
  2. **Criterios de Aceptación**: Lista de verificación (Checklist) clara.
  3. **Detalle Técnico**: Cambios sugeridos en DB, Backend y Frontend.
  4. **Out of Scope**: Lo que NO se incluye en este ticket.
- Before calling `jira_create_issue`, verify the target Jira Project Key (e.g. `POS`, `NEXO`).

## Standard Jira Template

```markdown
### 🎯 Problema / Necesidad
<Descripción del problema o requerimiento de negocio>

### ✅ Criterios de Aceptación
- [ ] <Criterio 1>
- [ ] <Criterio 2>

### 🛠️ Especificación Técnica
- **Base de Datos / Migraciones:** <Tablas/campos a modificar>
- **Backend (NestJS):** <Servicios/Endpoints a tocar>
- **Frontend (React/Vite):** <Componentes/Páginas a modificar>

### ⛔ Fuera de Alcance
- <Lo que queda postergado para otra etapa>
```

## Execution Steps

1. Extract or ask for the Jira Project Key if not provided.
2. Structure the task details using the Standard Jira Template.
3. Call the Jira MCP tool `jira_create_issue` to create the ticket automatically.
4. Return the ticket key (e.g., `POS-42`) and link to the user.
