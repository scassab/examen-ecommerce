import { Money } from '../models/money';
import type { Percentage } from '../models/percentage';

/** Resultado de contrastar la cascada cruda contra el tope absoluto. */
export interface CapEvaluation {
  /** Importe recortado de la cascada. Cero cuando no hubo que truncar. */
  readonly adjustment: Money;
  /** Si el descuento tocó el techo, aunque no haya hecho falta recortar. */
  readonly reached: boolean;
  /** Descuento máximo admitido para este subtotal. */
  readonly maxDiscount: Money;
}

/**
 * Tope absoluto de descuento (regla 4 del enunciado).
 *
 * Se modela como pieza propia y no como una regla más porque no concede
 * descuento: lo limita. Mezclarla con las estrategias obligaría a cada regla a
 * conocer el total acumulado por todas las demás, que es exactamente el
 * acoplamiento que el patrón Strategy evita.
 *
 * El recorte se reporta como `adjustment` explícito en lugar de repartirse
 * entre las reglas: así el desglose sigue cuadrando y el cliente ve por qué el
 * ahorro no coincide con la suma de las tres líneas.
 */
export class DiscountCapPolicy {
  public constructor(public readonly maxPercentage: Percentage) {}

  public evaluate(originalSubtotal: Money, rawDiscount: Money): CapEvaluation {
    const maxDiscount = this.maxPercentage.applyTo(originalSubtotal);

    if (rawDiscount.isGreaterThan(maxDiscount)) {
      return {
        adjustment: rawDiscount.subtract(maxDiscount),
        reached: true,
        maxDiscount,
      };
    }

    return {
      adjustment: Money.zero(),
      // Alcanzar el tope exacto también cuenta: el cliente llegó al ahorro
      // máximo y la interfaz debe avisarlo aunque no se haya truncado nada.
      reached: !rawDiscount.isZero() && rawDiscount.equals(maxDiscount),
      maxDiscount,
    };
  }
}
