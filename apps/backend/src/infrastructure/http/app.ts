import { API_ROUTES } from '@ecommerce/shared';
import cors from 'cors';
import express, { type Express } from 'express';

import type { AppConfig } from '../config/env';

import { errorHandler } from './middlewares/error.handler';
import { notFoundHandler } from './middlewares/not-found.handler';
import { createHealthRouter } from './routes/health.route';

/** Un carrito nunca pesa más que esto; el límite frena cargas abusivas. */
const JSON_BODY_LIMIT = '100kb';

/**
 * Construye la aplicación Express sin ponerla a escuchar.
 *
 * Separar la construcción del arranque es lo que permite montar la app entera
 * en las pruebas con supertest sin abrir un puerto real, y es también la razón
 * de que la configuración entre por parámetro en lugar de leerse aquí dentro.
 */
export const createApp = (config: AppConfig): Express => {
  const app = express();

  app.disable('x-powered-by');
  app.use(cors({ origin: config.api.corsOrigin }));
  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  app.use(API_ROUTES.health, createHealthRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
