import {
  MAX_COUPON_CODE_LENGTH,
  MAX_QUANTITY_PER_LINE,
  cartItemSchema,
  checkoutRequestSchema,
  quoteRequestSchema,
} from '../src/validation/cart.schema';

const firstIssuePath = (payload: unknown): string => {
  const result = quoteRequestSchema.safeParse(payload);
  if (result.success) {
    throw new Error('expected the payload to be rejected');
  }
  const [issue] = result.error.issues;
  return issue === undefined ? '' : issue.path.map(String).join('.');
};

describe('cartItemSchema', () => {
  it('accepts a well formed line', () => {
    const result = cartItemSchema.safeParse({ productId: 'laptop-pro', quantity: 2 });

    expect(result.success).toBe(true);
  });

  it.each<[string, number]>([
    ['zero', 0],
    ['negative', -3],
    ['fractional', 1.5],
    ['above the per line limit', MAX_QUANTITY_PER_LINE + 1],
  ])('rejects a %s quantity', (_label, quantity) => {
    const result = cartItemSchema.safeParse({ productId: 'laptop-pro', quantity });

    expect(result.success).toBe(false);
  });

  it('rejects a blank product id', () => {
    const result = cartItemSchema.safeParse({ productId: '', quantity: 1 });

    expect(result.success).toBe(false);
  });

  it('rejects a quantity that is not a number', () => {
    const result = cartItemSchema.safeParse({ productId: 'laptop-pro', quantity: '2' });

    expect(result.success).toBe(false);
  });
});

describe('quoteRequestSchema', () => {
  const validItems = [{ productId: 'laptop-pro', quantity: 1 }];

  it('accepts a cart without coupon', () => {
    const result = quoteRequestSchema.safeParse({ items: validItems });

    expect(result.success).toBe(true);
    expect(result.success && result.data.couponCode).toBeUndefined();
  });

  it('normalises the coupon code to trimmed upper case', () => {
    const result = quoteRequestSchema.safeParse({
      items: validItems,
      couponCode: '  welcome2026 ',
    });

    expect(result.success && result.data.couponCode).toBe('WELCOME2026');
  });

  it.each<[string, string]>([
    ['an empty string', ''],
    ['only whitespace', '   '],
  ])('treats %s as no coupon at all', (_label, couponCode) => {
    const result = quoteRequestSchema.safeParse({ items: validItems, couponCode });

    expect(result.success && result.data.couponCode).toBeNull();
  });

  it('accepts an explicit null coupon', () => {
    const result = quoteRequestSchema.safeParse({ items: validItems, couponCode: null });

    expect(result.success && result.data.couponCode).toBeNull();
  });

  it('rejects a coupon code longer than the contract allows', () => {
    const result = quoteRequestSchema.safeParse({
      items: validItems,
      couponCode: 'X'.repeat(MAX_COUPON_CODE_LENGTH + 1),
    });

    expect(result.success).toBe(false);
  });

  it('rejects an empty cart', () => {
    expect(firstIssuePath({ items: [] })).toBe('items');
  });

  it('rejects duplicated product ids pointing at the offending line', () => {
    expect(
      firstIssuePath({
        items: [
          { productId: 'laptop-pro', quantity: 1 },
          { productId: 'laptop-pro', quantity: 2 },
        ],
      }),
    ).toBe('items.1.productId');
  });

  it('allows the same quantity across different products', () => {
    const result = quoteRequestSchema.safeParse({
      items: [
        { productId: 'laptop-pro', quantity: 1 },
        { productId: 'coffee-maker', quantity: 1 },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('reports the offending line index for an invalid quantity', () => {
    expect(
      firstIssuePath({
        items: [
          { productId: 'laptop-pro', quantity: 1 },
          { productId: 'coffee-maker', quantity: 0 },
        ],
      }),
    ).toBe('items.1.quantity');
  });

  it('strips unknown properties instead of trusting them', () => {
    const result = quoteRequestSchema.safeParse({
      items: validItems,
      totalInCents: 1,
    });

    expect(result.success).toBe(true);
    expect(result.success && Object.keys(result.data)).toEqual(['items']);
  });

  it.each<[string, unknown]>([
    ['null', null],
    ['a string', 'items'],
    ['an array', []],
    ['an empty object', {}],
  ])('rejects %s as a payload', (_label, payload) => {
    const result = quoteRequestSchema.safeParse(payload);

    expect(result.success).toBe(false);
  });
});

describe('checkoutRequestSchema', () => {
  it('enforces the same contract as a quote request', () => {
    const payload = { items: [{ productId: 'laptop-pro', quantity: 1 }], couponCode: 'welcome2026' };

    expect(checkoutRequestSchema.safeParse(payload)).toEqual(quoteRequestSchema.safeParse(payload));
  });
});
