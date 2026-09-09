# Gobernanza de IA

Este proyecto se construyó con **Claude Code** como herramienta de desarrollo. El
documento describe cómo se gobernó esa herramienta: qué se automatizó, con qué
agentes se auditó el resultado y, sobre todo, **qué sugerencias se rechazaron y
por qué**.

## 1. Skill: generación de suites de prueba

**Archivo:** [`.claude/skills/generar-suite-pruebas/SKILL.md`](../.claude/skills/generar-suite-pruebas/SKILL.md)

Formaliza el flujo con el que se cubrió el motor de descuentos. Existe porque la
generación automática de pruebas tiende a producir muchos casos felices que suben
la cobertura sin proteger de nada.

Impone siete reglas, de las cuales tres son las que cambian el resultado:

- **Partir de la regla de negocio, no del código.** Una prueba derivada de la
  implementación replica sus errores en lugar de detectarlos.
- **Enumerar los límites antes de escribir nada:** valor bajo el umbral, valor
  exacto, valor por encima, caso vacío y caso que desborda al error.
- **Documentar la aritmética en el propio caso**, para que el número esperado se
  pueda verificar sin ejecutar nada.

Aplicada al motor produjo los casos que una generación ingenua no habría escrito:
el subtotal de **exactamente** 100 USD que **no** dispara el descuento por volumen,
los 102 USD de tecnología que caen bajo el umbral **después** del 10% de
categoría, y el cupón del 100% que demuestra que el efectivo nunca supera el tope.

## 2. Agentes de auditoría

### `auditor-reglas-descuento`

**Archivo:** [`.claude/agents/auditor-reglas-descuento.md`](../.claude/agents/auditor-reglas-descuento.md)

Contrasta la implementación contra el enunciado. Tiene **acceso de solo lectura**
(`Read`, `Grep`, `Glob`) a propósito: audita y reporta, no corrige. Un auditor que
puede arreglar lo que encuentra deja de ser auditor.

Busca cuatro cosas concretas: que la cascada sea multiplicativa y no una suma de
porcentajes, que la base de cada regla sea la correcta, que el tope se aplique al
consolidado y no regla por regla, y que no exista aritmética monetaria en
decimales. Su formato de salida obliga a declarar la consecuencia de cada
hallazgo: *qué cobra de más o de menos el cliente*.

### `auditor-cobertura`

**Archivo:** [`.claude/agents/auditor-cobertura.md`](../.claude/agents/auditor-cobertura.md)

Su regla fundacional es que **no debe subir la cobertura**, sino detectar
cobertura engañosa: pruebas sin aserción real, aserciones tautológicas, rutas de
error sin provocar y porcentaje inflado por archivos de tipos sin lógica.

Ordena su revisión por importancia de negocio, no por porcentaje: primero el motor
de descuentos y las validaciones de stock.

## 3. Bitácora de co-creación

### Decisiones de liderazgo técnico

La IA no eligió nada de lo que define este sistema. Estas son las decisiones que
se tomaron como líder técnico, con la alternativa que se descartó y dónde se
verifica cada una en el código:

| Decisión | Alternativa descartada | Por qué | Dónde se ve |
|---|---|---|---|
| **Arquitectura hexagonal** en el backend | Capas MVC clásicas | El enunciado exige aislar las reglas matemáticas de persistencia y controladores; el hexágono *es* esa exigencia | `apps/backend/src/{domain,application,infrastructure}` |
| **TypeORM sobre PostgreSQL** | Persistencia en memoria o JSON | Una orden con dinero exige transacciones y restricciones reales, no un archivo | `infrastructure/persistence/typeorm` |
| **Tabla `categories` con clave foránea** | Columna con `CHECK`, que era **la recomendación de la IA** | Se priorizó un modelo normalizado y extensible, y permitió servir la etiqueta en español desde la base sin tocar código | `migrations/*-initial-schema.ts` |
| **`order_items` + `order_discounts` normalizados** | Tres columnas fijas de descuento en `orders` | Añadir una cuarta promoción no debe exigir `ALTER TABLE`, y el desglose se audita en SQL | `entities/order.entities.ts` |
| **Bloqueo pesimista en el checkout** | Validar y actualizar sin transacción | Dos clientes no pueden comprar la última unidad; sin bloqueo, ambos leen stock disponible | `typeorm-checkout.unit-of-work.ts` |
| **Dinero en centavos enteros** | `DECIMAL(10,2)`, como proponía el diagrama inicial | El error de coma flotante se amplifica en una cascada de tres descuentos multiplicativos | `domain/models/money.ts` |
| **Contratos compartidos con Zod** | Duplicar tipos en cada aplicación | Tipo estático y validación en runtime derivan del mismo esquema y no pueden divergir | `packages/shared/src/validation` |
| **Angular con Atomic Design** | Componentes agrupados por función | Obliga a que los componentes de `ui/` no conozcan el estado, y eso los hace probables en aislamiento | `apps/frontend/src/app/ui` |
| **Sin autenticación, sesión simulada** | Implementar login con JWT | No lo pide ninguna historia de usuario; el tiempo fue al motor, la cobertura y la documentación | `core/session/session.service.ts` |
| **Carrito no persistido** | Tablas `carrito` e `item_carrito` | Habría exigido identidad de sesión y endpoints que ninguna historia pide | `state/cart.store.ts` |
| **Motor con configuración inyectada** | Porcentajes incrustados en las reglas | Es lo que hace demostrable un tope que, con los números del enunciado, no puede alcanzarse | `domain/discounts/discount-config.ts` |
| **Código en inglés, comentarios y docs en español** | Un solo idioma para todo | El código viaja con el ecosistema; la explicación viaja con el equipo | Todo el repositorio |
| **`any` prohibido por el linter** | Confiar en la disciplina | Una regla que no falla el build no es una regla | `eslint.config.mjs` |

### Gobierno del proceso, no solo del código

Tres decisiones de método que condicionaron cómo se usó la herramienta:

1. **Ningún commit lo ejecuta la IA.** La herramienta deja los cambios listos y
   propone el mensaje; el desarrollador revisa, decide y firma. El historial del
   repositorio es autoría humana verificable.

2. **Revisión commit a commit, no por bloques.** Se rechazó explícitamente la
   propuesta de la IA de agrupar el trabajo en tres bloques de aprobación. Cada
   paso se revisó por separado, aun sabiendo que costaba tiempo del plazo.

3. **Una rama por commit, con PR a `integration`.** Dieciséis PRs con historial
   incremental, en lugar de una rama monolítica.

### Reparto del trabajo

| | Responsable |
|---|---|
| Arquitectura, stack y modelo de datos | **Desarrollador** |
| Interpretación de las reglas de negocio | **Desarrollador**, con la IA planteando ambigüedades |
| Escritura del código y de las pruebas | **IA, bajo dirección** |
| Revisión y aceptación de cada cambio | **Desarrollador** |
| Commits, ramas y pull requests | **Desarrollador**, sin excepción |

**Estimación honesta:** alrededor del **85–90% de las líneas** fueron escritas por
la IA a partir de instrucciones concretas. El **100% pasó por revisión** antes de
entrar al repositorio, y ninguna de las decisiones de la tabla anterior salió de
la herramienta: varias se tomaron **en contra de su recomendación**.

### Correcciones a la IA

#### 1. El tope del 35% es matemáticamente inalcanzable

**Contexto.** La IA iba a implementar la regla 4 del enunciado tal cual: truncar
el descuento consolidado en el 35%.

**El problema, detectado antes de escribir código.** Con los porcentajes del
enunciado aplicados en cascada, el descuento máximo posible es:

```
1 − (0.90 × 0.95 × 0.85) = 27.325%
```

Ni siquiera sumando los porcentajes de forma plana (10 + 5 + 15 = 30%) se alcanza
el 35%. **El tope nunca puede dispararse**, y sin embargo la HU 4 y la
demostración en vivo exigen ver la alerta de límite alcanzado. Dos requisitos del
enunciado se contradicen entre sí.

**Decisión tomada.** No falsear las reglas ni fingir la alerta. En su lugar:

- el motor recibe un `DiscountConfig` **inyectado** con porcentajes, umbral y
  tope, en vez de tenerlos incrustados;
- el perfil por defecto reproduce el enunciado **al pie de la letra**;
- se siembra un cupón de demostración (`MEGA50`) que sí lleva la cascada por
  encima del tope, de modo que el truncamiento es observable en vivo;
- las pruebas cubren el truncamiento inyectando configuración, no datos mágicos.

**Por qué importa.** Un motor con los números incrustados habría pasado igual las
pruebas, pero habría dejado el requisito 4 sin forma de demostrarse. La
configurabilidad no es aquí una floritura: es lo que hace verificable una regla
que, tal como está escrita, no puede ocurrir.

#### 2. La IA propuso Jest para el frontend basándose en información obsoleta

**Contexto.** Al decidir el runner de pruebas del frontend, la IA planteó la
elección como "Jest frente a Karma", recomendando Jest porque Karma exige un
navegador instalado.

**El problema.** Esa comparación estaba desactualizada. Al generar el proyecto se
comprobó que **Angular 22 incluye Vitest de fábrica**, integrado en el builder
`@angular/build:unit-test`, y que ni Karma ni Jest son ya el camino natural.
Forzar Jest habría significado desinstalar lo que el framework trae, añadir
`jest-preset-angular` y asumir el riesgo de incompatibilidad, sin ganar nada.

**Decisión tomada.** Verificar contra el proyecto real en lugar de aceptar la
recomendación, y quedarse con Vitest. El monorepo queda con dos runners —Jest en
backend y contratos, Vitest en frontend— y esa es la respuesta que se defiende:
**cada capa usa la herramienta nativa de su stack**.

**Por qué importa.** Es el caso típico de una recomendación razonable sostenida
sobre una premisa falsa. La corrección no vino de desconfiar por principio, sino
de **contrastar contra la versión realmente instalada**.

#### 3. Tres APIs de PrimeNG 22 asumidas por memoria y desmentidas por el código

Durante la construcción de la interfaz, la IA escribió marcado que no compilaba
porque daba por buenas APIs de versiones anteriores:

| Escrito | Realidad en PrimeNG 22 |
|---|---|
| `<p-message [text]="...">` | El mensaje usa proyección de contenido; `text` no existe |
| `<p-inputNumber [min] [max]>` | El selector es `p-inputnumber` y **`min`/`max` desaparecieron** |
| `<p-chip [styleClass]="...">` | El chip no expone `styleClass` |

**Decisión tomada.** En lugar de probar variantes hasta que compilara, se leyeron
las declaraciones de tipos del paquete instalado
(`node_modules/primeng/types/*.d.ts`) para confirmar selectores y entradas reales.
La desaparición de `min`/`max` obligó además a **mover el acotado de cantidades al
componente**, lo que resultó mejor: la regla dejó de vivir en la plantilla y pasó
a ser comprobable sin renderizar, con cuatro pruebas propias.

#### 4. La licencia de PrimeNG y la tentación de ocultar el aviso

**Contexto.** Al ejecutar la aplicación apareció un recuadro rojo *"Invalid
PrimeUI License"*: PrimeNG 22 es software comercial y exige clave.

**Decisión tomada.** La IA planteó explícitamente que **no ocultaría el aviso**.
El banner se inyecta en un *shadow root* cerrado precisamente para impedirlo, y la
licencia del paquete prohíbe eliminar sus mecanismos. Se registró la **Community
License gratuita**, para la que el proyecto califica, y se verificó su validez
ejecutando el verificador en Node antes de darla por buena.

**Por qué importa.** El camino corto —tapar el recuadro con CSS— habría
funcionado visualmente y habría sido indefendible ante un jurado que abra las
herramientas de desarrollo.

### Qué se ganó gobernando la herramienta

Las cuatro correcciones tienen un patrón común: **la IA acierta en lo mecánico y
falla en lo que exige contrastar contra la realidad concreta** — la aritmética del
enunciado, la versión instalada de una librería, los términos de una licencia. El
valor del desarrollador no estuvo en teclear, sino en decidir qué se construye,
verificar cada afirmación contra la fuente y firmar personalmente cada commit.
