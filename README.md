# examen-ecommerce

Checkout de e-commerce con **motor de descuentos acumulativos**: API REST en
Express + TypeScript sobre arquitectura hexagonal, SPA en Angular con Atomic
Design, y un paquete compartido que centraliza contratos y validación como única
fuente de verdad entre capas.

| | |
|---|---|
| **Pruebas** | 423 (27 contratos · 239 backend · 157 frontend) |
| **Cobertura** | 100% · 98.6% · 97.6% — umbral exigido: 80% |
| **Arquitectura** | Hexagonal (Ports & Adapters) + Atomic Design |
| **Patrones** | Strategy · Factory · Repository · Observer |

## Estructura

```
examen-ecommerce/
├── apps/
│   ├── backend/          API REST · Express · TypeORM · PostgreSQL · hexagonal
│   └── frontend/         SPA · Angular · PrimeNG + PrimeFlex · Atomic Design
├── packages/
│   └── shared/           Contratos (DTOs), tipos y validadores compartidos
├── docs/
│   ├── arquitectura.md   Justificación, trade-offs y patrones aplicados
│   └── ia.md             Gobernanza y bitácora de co-creación con IA
└── README.md
```

## Requisitos

| Herramienta | Versión |
|---|---|
| Node.js | >= 22 (probado en 24.19.0, ver `.nvmrc`) |
| npm | >= 10 |
| PostgreSQL | >= 14, con una base llamada `ecommerce` |

## Instalación

```bash
git clone https://github.com/scassab/examen-ecommerce.git
cd examen-ecommerce
npm install
cp .env.example .env      # completar las credenciales de PostgreSQL
```

### Variables de entorno

Se leen desde el `.env` de la raíz. La aplicación **no arranca** si falta alguna
de las de base de datos: es preferible fallar al inicio que apuntar al servidor
equivocado.

| Variable | Por defecto | Descripción |
|---|---|---|
| `API_PORT` | `3000` | Puerto de la API |
| `CORS_ORIGIN` | `http://localhost:4200` | Origen autorizado del frontend |
| `DB_HOST` | — | Host de PostgreSQL |
| `DB_PORT` | `5432` | Puerto de PostgreSQL |
| `DB_USER` | — | Usuario |
| `DB_PASSWORD` | — | Contraseña |
| `DB_NAME` | — | Base de datos (`ecommerce`) |
| `DB_TEST_SCHEMA` | `test` | Esquema aislado para pruebas de integración |

### Base de datos

```bash
npm run db:reset          # ejecuta migraciones y siembra el catálogo
```

Deja 3 categorías, 8 productos y 4 cupones. Es **repetible**: probar el rechazo
por falta de stock consume existencias, así que este comando devuelve la base al
punto de partida las veces que haga falta.

## Ejecución

```bash
npm run dev               # compila los contratos y levanta API y SPA a la vez
```

| | URL |
|---|---|
| Frontend | http://localhost:4200 |
| API | http://localhost:3000 |
| Salud de la API | http://localhost:3000/api/health |

Por separado: `npm run dev:backend` y `npm run dev:frontend`.

## Pruebas

```bash
npm test                  # los tres workspaces
npm run test:coverage     # con reporte de cobertura y gate del 80%
```

El umbral del 80% está configurado como **gate real**: si la cobertura baja, el
comando falla. Por workspace:

```bash
npm run test:coverage -w @ecommerce/backend
npm run test:coverage -w @ecommerce/frontend
npm run test:coverage -w @ecommerce/shared
```

## Otros comandos

| Comando | Descripción |
|---|---|
| `npm run build` | Compila los tres workspaces |
| `npm run lint` | ESLint con `no-explicit-any` en error |
| `npm run db:reset` | Migraciones + semillas |

## Reglas de negocio

Los descuentos se aplican **en cascada multiplicativa**, cada uno sobre el total
que dejó el anterior:

| # | Regla | Base de cálculo |
|---|---|---|
| 1 | 10% de categoría | Solo las líneas de **Tecnología** |
| 2 | 5% por volumen | Total tras la regla 1, si **supera** 100 USD |
| 3 | 15% por cupón | Total tras la regla 2 |
| 4 | Tope del 35% | Sobre el subtotal **original** |

> La cascada topa matemáticamente en **27.325%**, así que el límite del 35% del
> enunciado no puede alcanzarse con sus propios porcentajes. El motor recibe la
> configuración inyectada y se siembra un cupón de demostración para poder
> verificarlo. El análisis está en [`docs/ia.md`](docs/ia.md).

### Cupones sembrados

| Código | Efecto |
|---|---|
| `WELCOME2026` | 15%, vigente — la cascada completa del enunciado |
| `MEGA50` | 50% — **dispara el tope del 35%** |
| `SUMMER2024` | Vencido — estado `EXPIRED` |
| `INACTIVE10` | Desactivado — estado `INVALID` |

## API

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/health` | Estado del servicio |
| `GET` | `/api/products` | Catálogo con existencias |
| `POST` | `/api/cart/quote` | Cotiza el carrito sin efectos secundarios |
| `POST` | `/api/checkout` | Compra: valida stock, descuenta y persiste |
| `GET` | `/api/orders` | Órdenes persistidas |

Ejemplo:

```bash
curl -X POST http://localhost:3000/api/cart/quote \
  -H "Content-Type: application/json" \
  -d '{"items":[{"productId":"11111111-1111-4111-8111-111111111101","quantity":1}],"couponCode":"MEGA50"}'
```

Los importes viajan siempre en **centavos enteros**: una cascada de tres
descuentos multiplicativos amplifica el error de coma flotante justo donde el
negocio exige totales exactos.

## Convenciones

- **Código, carpetas, identificadores y mensajes de commit en inglés**;
  comentarios del código y documentación en español.
- **Tipado estricto de extremo a extremo**: `strict` de TypeScript y `any`
  prohibido por el linter.
- Una rama por commit, PR hacia `integration`.

## Documentación

- [Arquitectura, trade-offs y patrones](docs/arquitectura.md)
- [Gobernanza de IA y bitácora de co-creación](docs/ia.md)

---

© 2026 Sergio Castro Saboya. Todos los derechos son reservados.
