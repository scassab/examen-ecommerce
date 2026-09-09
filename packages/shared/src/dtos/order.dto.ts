import type { QuoteResponseDto } from './quote.dto';

/**
 * Orden persistida que devuelven POST /api/checkout y GET /api/orders.
 *
 * La orden incrusta el desglose que fue autoritativo en el momento del
 * checkout, de modo que un cambio posterior de precios o de configuración de
 * descuentos no pueda reescribir la historia.
 */
export interface OrderDto {
  readonly id: string;
  /** Marca de tiempo en formato ISO 8601. */
  readonly createdAt: string;
  readonly summary: QuoteResponseDto;
}

export type CheckoutResponseDto = OrderDto;
