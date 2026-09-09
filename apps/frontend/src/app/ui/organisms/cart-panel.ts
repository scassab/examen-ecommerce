import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { CouponStatus, QuoteResponseDto } from '@ecommerce/shared';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { ProgressBarModule } from 'primeng/progressbar';

import type { CartLineView } from '../molecules/cart-line';
import { CartLine } from '../molecules/cart-line';
import { CouponInput } from '../molecules/coupon-input';

import { DiscountSummary } from './discount-summary';

/**
 * Panel del carrito: líneas, cupón y desglose.
 *
 * Sigue siendo presentacional: recibe el estado y emite intenciones. La página
 * es quien decide qué hacer con ellas, de modo que este panel podría reutilizarse
 * en otro flujo sin arrastrar el store detrás.
 */
@Component({
  selector: 'app-cart-panel',
  imports: [
    CardModule,
    ButtonModule,
    MessageModule,
    ProgressBarModule,
    CartLine,
    CouponInput,
    DiscountSummary,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cart-panel.html',
  styleUrl: './cart-panel.scss',
})
export class CartPanel {
  public readonly lines = input.required<readonly CartLineView[]>();
  public readonly subtotalInCents = input.required<number>();
  public readonly quote = input.required<QuoteResponseDto | null>();
  public readonly couponStatus = input<CouponStatus>('NOT_PROVIDED');
  public readonly quoting = input<boolean>(false);
  public readonly submitting = input<boolean>(false);
  public readonly errorMessage = input<string | null>(null);

  public readonly quantityChange = output<{ productId: string; quantity: number }>();
  public readonly remove = output<string>();
  public readonly applyCoupon = output<string>();
  public readonly clearCoupon = output<void>();
  public readonly checkout = output<void>();

  protected onQuantityChange(productId: string, quantity: number): void {
    this.quantityChange.emit({ productId, quantity });
  }
}
