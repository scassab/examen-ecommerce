import { Injectable, computed, signal } from '@angular/core';
import type { CartItemDto, ProductDto } from '@ecommerce/shared';

/** Una línea del carrito: el producto tal como lo sirvió la API y su cantidad. */
export interface CartLineState {
  readonly product: ProductDto;
  readonly quantity: number;
}

/** Una línea nunca baja de una unidad; quitarla es una operación distinta. */
const MIN_QUANTITY = 1;

/**
 * Estado del carrito (patrón Observer sobre señales).
 *
 * Una sola señal privada guarda las líneas y todo lo demás son valores
 * derivados: subtotal, unidades y el payload que viaja a la API. Los
 * componentes se suscriben a lo que necesitan y Angular recalcula solo esa
 * parte cuando cambian las líneas, que es el patrón Observer llevado al
 * framework: nadie notifica a nadie a mano y no hay estado duplicado que se
 * pueda desincronizar.
 *
 * El **subtotal original** se calcula aquí, en el cliente, para que la pantalla
 * responda al instante como exige la HU 1. Los descuentos, en cambio, nunca se
 * calculan aquí: son responsabilidad exclusiva del backend.
 *
 * El carrito no se persiste: vive mientras dure la sesión del navegador. Es una
 * decisión de alcance consciente, no un olvido.
 */
@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly lines = signal<readonly CartLineState[]>([]);

  public readonly items = this.lines.asReadonly();

  public readonly isEmpty = computed(() => this.lines().length === 0);

  public readonly totalUnits = computed(() =>
    this.lines().reduce((total, line) => total + line.quantity, 0),
  );

  /** Subtotal sin descuentos, en centavos enteros. */
  public readonly originalSubtotalInCents = computed(() =>
    this.lines().reduce(
      (total, line) => total + line.product.unitPriceInCents * line.quantity,
      0,
    ),
  );

  /** Cantidades indexadas por producto, para que el catálogo no recorra el carrito. */
  public readonly quantities = computed(
    () => new Map(this.lines().map((line) => [line.product.id, line.quantity])),
  );

  /** Payload que consumen la cotización y el checkout. */
  public readonly requestItems = computed<readonly CartItemDto[]>(() =>
    this.lines().map((line) => ({ productId: line.product.id, quantity: line.quantity })),
  );

  public quantityOf(productId: string): number {
    return this.quantities().get(productId) ?? 0;
  }

  /**
   * Agrega unidades de un producto.
   *
   * Si el producto ya estaba, suma en lugar de duplicar la línea: el contrato
   * de la API rechaza dos líneas del mismo producto, así que la invariante se
   * mantiene desde el origen. El total nunca supera las existencias conocidas.
   */
  public add(product: ProductDto, quantity = 1): void {
    if (quantity <= 0 || product.stock === 0) {
      return;
    }

    this.lines.update((lines) => {
      const existing = lines.find((line) => line.product.id === product.id);

      if (existing === undefined) {
        return [...lines, { product, quantity: Math.min(quantity, product.stock) }];
      }

      return lines.map((line) =>
        line.product.id === product.id
          ? { product, quantity: Math.min(line.quantity + quantity, product.stock) }
          : line,
      );
    });
  }

  /** Fija la cantidad exacta de una línea, acotada entre 1 y el stock. */
  public setQuantity(productId: string, quantity: number): void {
    this.lines.update((lines) =>
      lines.map((line) =>
        line.product.id === productId
          ? {
              product: line.product,
              quantity: Math.min(
                Math.max(Math.trunc(quantity), MIN_QUANTITY),
                line.product.stock,
              ),
            }
          : line,
      ),
    );
  }

  public remove(productId: string): void {
    this.lines.update((lines) => lines.filter((line) => line.product.id !== productId));
  }

  public clear(): void {
    this.lines.set([]);
  }

  /**
   * Reconcilia el carrito con un catálogo recién traído del servidor.
   *
   * Tras una compra el stock cambia: las líneas se recortan a lo que queda y
   * desaparecen las de productos agotados. Sin esto, el carrito seguiría
   * ofreciendo unidades que ya no existen.
   */
  public syncWithCatalog(products: readonly ProductDto[]): void {
    const catalog = new Map(products.map((product) => [product.id, product]));

    this.lines.update((lines) =>
      lines
        .map((line) => {
          const current = catalog.get(line.product.id);

          if (current === undefined) {
            return null;
          }

          return { product: current, quantity: Math.min(line.quantity, current.stock) };
        })
        .filter((line): line is CartLineState => line !== null && line.quantity >= MIN_QUANTITY),
    );
  }
}
