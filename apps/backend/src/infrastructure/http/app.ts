import { API_ROUTES } from '@ecommerce/shared';
import cors from 'cors';
import express, { type Express } from 'express';

import type { CheckoutUseCase } from '../../application/use-cases/checkout.use-case';
import type {
  ListOrdersUseCase,
  ListProductsUseCase,
} from '../../application/use-cases/catalog.use-cases';
import type { QuoteCartUseCase } from '../../application/use-cases/quote-cart.use-case';
import type { AppConfig } from '../config/env';

import {
  createCheckoutRouter,
  createOrdersRouter,
  createProductsRouter,
  createQuoteRouter,
} from './controllers/api.controllers';
import { errorHandler } from './middlewares/error.handler';
import { notFoundHandler } from './middlewares/not-found.handler';
import { createHealthRouter } from './routes/health.route';

/** Un carrito nunca pesa más que esto; el límite frena cargas abusivas. */
const JSON_BODY_LIMIT = '100kb';

/**
 * Casos de uso que la capa HTTP necesita.
 *
 * Entran por parámetro en lugar de instanciarse aquí: la app se monta igual con
 * los adaptadores de PostgreSQL que con dobles en memoria, y eso es lo que
 * permite probar la API entera con supertest sin base de datos.
 */
export interface ApiDependencies {
  readonly listProducts: ListProductsUseCase;
  readonly quoteCart: QuoteCartUseCase;
  readonly checkout: CheckoutUseCase;
  readonly listOrders: ListOrdersUseCase;
}

/**
 * Construye la aplicación Express sin ponerla a escuchar.
 *
 * El orden del registro importa: primero las rutas, después el 404 y por último
 * el manejador de errores, que Express reconoce por su aridad de cuatro
 * parámetros.
 */
export const createApp = (config: AppConfig, dependencies: ApiDependencies): Express => {
  const app = express();

  app.disable('x-powered-by');
  app.use(cors({ origin: config.api.corsOrigin }));
  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  app.use(API_ROUTES.health, createHealthRouter());
  app.use(API_ROUTES.products, createProductsRouter(dependencies.listProducts));
  app.use(API_ROUTES.quote, createQuoteRouter(dependencies.quoteCart));
  app.use(API_ROUTES.checkout, createCheckoutRouter(dependencies.checkout));
  app.use(API_ROUTES.orders, createOrdersRouter(dependencies.listOrders));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
