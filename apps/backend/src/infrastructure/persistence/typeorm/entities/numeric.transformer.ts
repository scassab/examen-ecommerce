import type { ValueTransformer } from 'typeorm';

/**
 * Traduce las columnas `numeric` de PostgreSQL a números de JavaScript.
 *
 * El driver `pg` devuelve `numeric` como string a propósito, para no perder
 * precisión al convertir. Sin este transformador, un porcentaje llegaría al
 * dominio como `"27.21"` y cualquier comparación aritmética fallaría en
 * silencio. Los porcentajes son seguros en coma flotante porque no se acumulan;
 * el dinero, que sí se acumula, se guarda en centavos enteros.
 */
export const numericTransformer: ValueTransformer = {
  to: (value: number): number => value,
  from: (value: string | number | null): number | null =>
    value === null ? null : Number(value),
};
