import type { Category } from '../types/category';

/**
 * Producto del catálogo tal como lo expone GET /api/products.
 *
 * Los precios viajan como centavos enteros: una cascada de tres descuentos
 * multiplicativos amplifica el error de coma flotante justo donde el negocio
 * exige totales exactos, así que el dinero nunca se representa como decimal en
 * el transporte. Formatear a "$19.99" es responsabilidad del frontend.
 */
export interface ProductDto {
  readonly id: string;
  readonly name: string;
  /** Código estable de la categoría; es sobre este valor que decide el motor. */
  readonly category: Category;
  /** Etiqueta que se muestra al usuario, servida desde la tabla categories. */
  readonly categoryName: string;
  readonly unitPriceInCents: number;
  readonly stock: number;
}
