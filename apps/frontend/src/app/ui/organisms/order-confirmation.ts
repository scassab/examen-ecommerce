import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { OrderDto } from '@ecommerce/shared';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

import { CentsPipe } from '../atoms/cents.pipe';

/**
 * Confirmación de la orden persistida.
 *
 * Muestra el identificador que devolvió el servidor: es la prueba visible de
 * que la orden existe en base de datos y el número que se busca en pgAdmin
 * durante la demostración.
 */
@Component({
  selector: 'app-order-confirmation',
  imports: [DialogModule, ButtonModule, CentsPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-confirmation.html',
})
export class OrderConfirmation {
  public readonly order = input.required<OrderDto | null>();

  /** Se llama `dismissed` y no `close` porque ese nombre colisiona con el evento DOM nativo. */
  public readonly dismissed = output<void>();
}
