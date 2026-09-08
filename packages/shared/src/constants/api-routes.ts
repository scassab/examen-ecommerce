/**
 * Única fuente de verdad de las rutas REST, compartida por el router de Express
 * y por el cliente HTTP de Angular, para que un renombrado no las desincronice.
 */
export const API_ROUTES = {
  health: '/api/health',
  products: '/api/products',
  quote: '/api/cart/quote',
  checkout: '/api/checkout',
  orders: '/api/orders',
} as const;

export type ApiRoute = (typeof API_ROUTES)[keyof typeof API_ROUTES];
