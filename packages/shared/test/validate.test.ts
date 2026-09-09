import { z } from 'zod';

import { quoteRequestSchema } from '../src/validation/cart.schema';
import { validate } from '../src/validation/validate';

describe('validate', () => {
  it('returns the parsed data when the payload satisfies the schema', () => {
    const result = validate(quoteRequestSchema, {
      items: [{ productId: 'laptop-pro', quantity: 2 }],
      couponCode: 'welcome2026',
    });

    expect(result).toEqual({
      success: true,
      data: {
        items: [{ productId: 'laptop-pro', quantity: 2 }],
        couponCode: 'WELCOME2026',
      },
    });
  });

  it('flattens issues into dotted paths the frontend can map to a field', () => {
    const result = validate(quoteRequestSchema, {
      items: [{ productId: 'laptop-pro', quantity: 0 }],
    });

    expect(result.success).toBe(false);
    expect(result.success ? [] : result.issues).toContainEqual({
      path: 'items.0.quantity',
      message: 'quantity must be greater than zero',
    });
  });

  it('reports every violation at once instead of failing on the first one', () => {
    const result = validate(quoteRequestSchema, {
      items: [
        { productId: '', quantity: 0 },
        { productId: 'coffee-maker', quantity: -1 },
      ],
    });

    expect(result.success ? 0 : result.issues.length).toBeGreaterThanOrEqual(3);
  });

  it('keeps working with any schema, not only the cart ones', () => {
    expect(validate(z.string(), 'WELCOME2026')).toEqual({ success: true, data: 'WELCOME2026' });
  });
});
