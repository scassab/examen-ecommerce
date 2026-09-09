---
name: generar-suite-pruebas
description: Genera la suite de pruebas unitarias de una pieza del dominio a partir de sus reglas de negocio, priorizando casos de borde sobre casos felices. Usar al terminar cualquier módulo con lógica de negocio, antes de darlo por cerrado.
---

# Generación de suites de prueba orientadas a casos de borde

Esta skill formaliza el flujo que se siguió en este proyecto para cubrir el motor
de descuentos y la capa de aplicación. Su objetivo es evitar el fallo habitual de
la generación automática de pruebas: producir muchos casos felices que suben la
cobertura sin proteger de nada.

## Procedimiento

1. **Leer la regla, no el código.** Partir del enunciado o del comentario de
   negocio. Si la prueba se deriva de la implementación, replica sus errores.

2. **Enumerar los límites antes de escribir nada.** Para cada regla, listar:
   - el valor justo por debajo del umbral,
   - el valor exacto del umbral,
   - el valor justo por encima,
   - el caso vacío o nulo,
   - el caso que desborda hacia el error.

3. **Escribir primero el caso que más duele.** El primer `it` de cada bloque debe
   ser el que rompería producción, no el que confirma lo obvio.

4. **Una aserción por intención.** Si una prueba necesita tres `expect` para
   explicarse, probablemente son tres pruebas.

5. **Nombrar por comportamiento observable**, nunca por método invocado:
   - ❌ `it('llama a calculate')`
   - ✅ `it('does not apply at exactly one hundred dollars: the rule says "above"')`

6. **Documentar la aritmética en el propio caso.** Cuando el número esperado no es
   evidente, dejar el cálculo como comentario para que quien lo lea pueda
   verificarlo sin ejecutar nada:
   ```ts
   // 15% de 86925 son 13038.75 centavos: media unidad redondea hacia arriba.
   expect(result?.amount.inCents).toBe(13_039);
   ```

7. **Cerrar con invariantes.** Toda pieza con aritmética termina con pruebas
   parametrizadas que afirman lo que debe cumplirse *siempre*, sobre varios
   escenarios: totales que cuadran, resultados no negativos, límites respetados.

## Criterio de aceptación

La suite no está terminada mientras exista una regla del enunciado sin un caso
que la rompa. La cobertura es una consecuencia, no el objetivo: un módulo al 100%
sin casos de borde está peor probado que uno al 85% con ellos.

## Ejemplo de aplicación en este repositorio

Aplicada al motor de descuentos, esta skill produjo los casos que ninguna
generación automática ingenua habría escrito:

- subtotal de **exactamente** 100 USD, que **no** dispara el descuento por volumen
  porque el enunciado dice "supera";
- 100.01 USD, que sí lo dispara;
- 102 USD de tecnología que, tras el 10%, quedan por debajo del umbral: demuestra
  que el volumen se mide **después** de la categoría;
- tope alcanzado exacto, sin truncamiento;
- cupón del 100%, para probar que el efectivo nunca supera el tope.
