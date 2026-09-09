import type { OnInit} from '@angular/core';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import type { ProductDto } from '@ecommerce/shared';

import { CartStore } from '../../state/cart.store';
import { CatalogStore } from '../../state/catalog.store';
import { QuoteStore } from '../../state/quote.store';
import type { CartLineView } from '../../ui/molecules/cart-line';
import { CartPanel } from '../../ui/organisms/cart-panel';
import { DiscountCapAlert } from '../../ui/organisms/discount-cap-alert';
import { OrderConfirmation } from '../../ui/organisms/order-confirmation';
import { ProductGrid } from '../../ui/organisms/product-grid';

/**
 * Página de checkout: la única pieza que conoce los stores.
 *
 * Es el contenedor del patrón "componentes tontos, contenedor listo": traduce el
 * estado de los stores a las entradas que esperan los organismos y convierte sus
 * eventos en llamadas al store. Gracias a eso, ninguna pieza de `ui/` importa
 * estado y todas se prueban en aislamiento.
 */
@Component({
  selector: 'app-checkout-page',
  imports: [ProductGrid, CartPanel, OrderConfirmation, DiscountCapAlert],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './checkout-page.html',
  styleUrl: './checkout-page.scss',
})
export class CheckoutPage implements OnInit {
  private readonly catalog = inject(CatalogStore);
  private readonly cart = inject(CartStore);
  private readonly quotes = inject(QuoteStore);

  protected readonly products = this.catalog.items;
  protected readonly catalogLoading = this.catalog.isLoading;
  protected readonly catalogError = this.catalog.errorMessage;

  protected readonly quantities = this.cart.quantities;
  protected readonly subtotalInCents = this.cart.originalSubtotalInCents;

  protected readonly quote = this.quotes.current;
  protected readonly couponStatus = this.quotes.couponStatus;
  protected readonly quoting = this.quotes.isQuoting;
  protected readonly submitting = this.quotes.isSubmitting;
  protected readonly checkoutError = this.quotes.errorMessage;
  protected readonly lastOrder = this.quotes.lastOrder;
  protected readonly capReached = this.quotes.capReached;
  protected readonly maxDiscountPercentage = this.quotes.maxDiscountPercentage;

  /** Adapta las líneas del store a lo que necesita pintar la molécula. */
  protected readonly lines = computed<readonly CartLineView[]>(() =>
    this.cart.items().map((line) => ({
      productId: line.product.id,
      name: line.product.name,
      unitPriceInCents: line.product.unitPriceInCents,
      quantity: line.quantity,
      lineSubtotalInCents: line.product.unitPriceInCents * line.quantity,
      stock: line.product.stock,
    })),
  );

  public ngOnInit(): void {
    this.catalog.load();
  }

  protected onAdd(product: ProductDto): void {
    this.cart.add(product);
  }

  protected onQuantityChange(change: { productId: string; quantity: number }): void {
    this.cart.setQuantity(change.productId, change.quantity);
  }

  protected onRemove(productId: string): void {
    this.cart.remove(productId);
  }

  protected onApplyCoupon(code: string): void {
    this.quotes.applyCoupon(code);
  }

  protected onClearCoupon(): void {
    this.quotes.clearCoupon();
  }

  protected onCheckout(): void {
    this.quotes.checkout();
  }

  protected onCloseConfirmation(): void {
    this.quotes.dismissOrder();
  }

  protected onRetryCatalog(): void {
    this.catalog.load();
  }
}
