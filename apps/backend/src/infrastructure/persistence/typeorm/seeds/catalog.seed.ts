import type { Category } from '@ecommerce/shared';

export interface CategorySeed {
  readonly code: Category;
  readonly name: string;
}

export interface ProductSeed {
  readonly id: string;
  readonly name: string;
  readonly category: Category;
  readonly unitPriceInCents: number;
  readonly stock: number;
}

export interface CouponSeed {
  readonly code: string;
  readonly percentage: number;
  readonly active: boolean;
  readonly expiresAt: string | null;
}

export const CATEGORY_SEEDS: readonly CategorySeed[] = [
  { code: 'TECHNOLOGY', name: 'Tecnología' },
  { code: 'HOME', name: 'Hogar' },
  { code: 'CLOTHING', name: 'Ropa' },
];

/**
 * Catálogo de demostración.
 *
 * Los identificadores son fijos para que la demo sea repetible y las peticiones
 * de Postman sigan sirviendo después de resembrar. Los precios están elegidos
 * para que un carrito realista cruce el umbral de 100 USD sin forzarlo, y el
 * stock de la cafetera es bajo a propósito: es el producto con el que se
 * demuestra el rechazo por falta de existencias.
 */
export const PRODUCT_SEEDS: readonly ProductSeed[] = [
  {
    id: '11111111-1111-4111-8111-111111111101',
    name: 'Laptop Pro 14"',
    category: 'TECHNOLOGY',
    unitPriceInCents: 129_900,
    stock: 5,
  },
  {
    id: '11111111-1111-4111-8111-111111111102',
    name: 'Smartphone X',
    category: 'TECHNOLOGY',
    unitPriceInCents: 89_950,
    stock: 3,
  },
  {
    id: '11111111-1111-4111-8111-111111111103',
    name: 'Auriculares inalámbricos',
    category: 'TECHNOLOGY',
    unitPriceInCents: 7990,
    stock: 12,
  },
  {
    id: '11111111-1111-4111-8111-111111111104',
    name: 'Teclado mecánico',
    category: 'TECHNOLOGY',
    unitPriceInCents: 12_900,
    stock: 8,
  },
  {
    id: '22222222-2222-4222-8222-222222222201',
    name: 'Cafetera espresso',
    category: 'HOME',
    unitPriceInCents: 24_999,
    stock: 2,
  },
  {
    id: '22222222-2222-4222-8222-222222222202',
    name: 'Juego de sábanas',
    category: 'HOME',
    unitPriceInCents: 5990,
    stock: 20,
  },
  {
    id: '33333333-3333-4333-8333-333333333301',
    name: 'Chaqueta impermeable',
    category: 'CLOTHING',
    unitPriceInCents: 8990,
    stock: 7,
  },
  {
    id: '33333333-3333-4333-8333-333333333302',
    name: 'Zapatillas running',
    category: 'CLOTHING',
    unitPriceInCents: 11_900,
    stock: 4,
  },
];

/**
 * Cupones sembrados.
 *
 * Los cuatro existen por una razón concreta y cada uno respalda un caso de
 * prueba del enunciado: el cupón oficial, uno vencido, uno desactivado y el de
 * demostración, que es el único capaz de llevar la cascada por encima del tope
 * del 35%.
 */
export const COUPON_SEEDS: readonly CouponSeed[] = [
  { code: 'WELCOME2026', percentage: 15, active: true, expiresAt: '2026-12-31T23:59:59.000Z' },
  { code: 'SUMMER2024', percentage: 20, active: true, expiresAt: '2024-09-30T23:59:59.000Z' },
  { code: 'INACTIVE10', percentage: 10, active: false, expiresAt: null },
  { code: 'MEGA50', percentage: 50, active: true, expiresAt: null },
];
