import { InvalidValueError } from '../../../src/domain/errors/domain.error';
import type { CouponProperties } from '../../../src/domain/models/coupon';
import { Coupon } from '../../../src/domain/models/coupon';
import { Percentage } from '../../../src/domain/models/percentage';

const NOW = new Date('2026-09-09T15:00:00.000Z');

const buildCoupon = (overrides: Partial<CouponProperties> = {}): Coupon =>
  new Coupon({
    code: overrides.code ?? 'WELCOME2026',
    percentage: overrides.percentage ?? Percentage.fromNumber(15),
    active: overrides.active ?? true,
    expiresAt: overrides.expiresAt === undefined ? null : overrides.expiresAt,
  });

describe('Coupon', () => {
  it('refuses an empty code', () => {
    expect(() => buildCoupon({ code: '  ' })).toThrow(InvalidValueError);
  });

  it('is usable when active and not expired', () => {
    const coupon = buildCoupon({ expiresAt: new Date('2026-12-31T23:59:59.000Z') });

    expect(coupon.isUsableAt(NOW)).toBe(true);
    expect(coupon.statusAt(NOW)).toBe('APPLIED');
  });

  it('never expires when it has no expiry date', () => {
    const coupon = buildCoupon({ expiresAt: null });

    expect(coupon.hasExpiredAt(new Date('2099-01-01T00:00:00.000Z'))).toBe(false);
    expect(coupon.statusAt(NOW)).toBe('APPLIED');
  });

  it('is expired once the expiry date is in the past', () => {
    const coupon = buildCoupon({ expiresAt: new Date('2024-12-31T23:59:59.000Z') });

    expect(coupon.hasExpiredAt(NOW)).toBe(true);
    expect(coupon.isUsableAt(NOW)).toBe(false);
    expect(coupon.statusAt(NOW)).toBe('EXPIRED');
  });

  it('treats the exact expiry instant as already expired', () => {
    const coupon = buildCoupon({ expiresAt: NOW });

    expect(coupon.statusAt(NOW)).toBe('EXPIRED');
  });

  it('is reported as invalid, not expired, when it was deactivated', () => {
    const coupon = buildCoupon({ active: false, expiresAt: new Date('2024-01-01T00:00:00.000Z') });

    expect(coupon.statusAt(NOW)).toBe('INVALID');
    expect(coupon.isUsableAt(NOW)).toBe(false);
  });
});
