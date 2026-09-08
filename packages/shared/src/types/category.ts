/**
 * Categorías de producto disponibles en el catálogo.
 *
 * TECHNOLOGY es la categoría a la que apunta la regla de descuento por
 * categoría, así que el valor forma parte del contrato de la API y debe
 * mantenerse sincronizado con la semilla de la base de datos y con la
 * configuración del motor de descuentos.
 */
export const CATEGORIES = ['TECHNOLOGY', 'HOME', 'CLOTHING'] as const;

export type Category = (typeof CATEGORIES)[number];
