# examen-ecommerce

Monorepo full-stack de un checkout de e-commerce con **motor de descuentos acumulativos**:
API REST en Express + TypeScript sobre arquitectura hexagonal, SPA en Angular con Atomic Design
y un paquete compartido que centraliza contratos y validación como única fuente de verdad entre capas.

> La guía completa de instalación, variables de entorno y comandos se completa al cierre del proyecto.

## Estructura

```
examen-ecommerce/
├── apps/
│   ├── backend/          API REST · Express · TypeORM · PostgreSQL · hexagonal
│   └── frontend/         SPA · Angular · PrimeNG + PrimeFlex · Atomic Design
├── packages/             Contratos (DTOs), tipos y validadores compartidos
├── docs/
│   ├── arquitectura.md   Justificación de arquitectura, trade-offs y patrones
│   └── ia.md             Gobernanza y bitácora de co-creación con IA
└── README.md
```

## Requisitos

| Herramienta | Versión |
|---|---|
| Node.js | >= 22 (probado en 24.19.0, ver `.nvmrc`) |
| npm | >= 10 |
| PostgreSQL | >= 14 |

## Puesta en marcha

```bash
npm install                 # instala todos los workspaces
cp .env.example .env        # completar credenciales de PostgreSQL
```

## Comandos raíz

| Comando | Descripción |
|---|---|
| `npm run build` | Compila todos los workspaces |
| `npm test` | Ejecuta las pruebas de todos los workspaces |
| `npm run test:coverage` | Pruebas con reporte de cobertura (umbral 80%) |
| `npm run lint` | Análisis estático de todos los workspaces |

## Convenciones

- **Código, carpetas, identificadores y mensajes de commit en inglés.** Documentación (`.md`) en español.
- **Tipado estricto de extremo a extremo**: `strict` de TypeScript activo y `any` prohibido por linter.

## Documentación

- [Arquitectura, trade-offs y patrones](docs/arquitectura.md)
- [Gobernanza de IA y bitácora de co-creación](docs/ia.md)
