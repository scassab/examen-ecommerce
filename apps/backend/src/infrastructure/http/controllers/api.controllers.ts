import { checkoutRequestSchema, quoteRequestSchema } from '@ecommerce/shared';
import { Router } from 'express';

import { toOrderDto, toProductDto, toQuoteResponseDto } from '../../../application/mappers/api.mapper';
import type { CheckoutUseCase } from '../../../application/use-cases/checkout.use-case';
import type {
  ListOrdersUseCase,
  ListProductsUseCase,
} from '../../../application/use-cases/catalog.use-cases';
import type { QuoteCartUseCase } from '../../../application/use-cases/quote-cart.use-case';
import { parseBodyOrThrow } from '../request-parser';

/**
 * Controladores REST.
 *
 * Son deliberadamente delgados y siempre hacen lo mismo: validar el payload,
 * delegar en un caso de uso y traducir el resultado al contrato. No contienen
 * ni una regla de negocio, y por eso el motor de descuentos podría exponerse
 * mañana por GraphQL o por una cola sin tocar una línea de lógica.
 *
 * Tampoco capturan errores: Express 5 propaga el rechazo de un handler
 * asíncrono al manejador de errores, que es el único sitio que sabe traducir
 * dominio a códigos HTTP.
 */
export const createProductsRouter = (listProducts: ListProductsUseCase): Router => {
  const router = Router();

  router.get('/', async (_request, response) => {
    const products = await listProducts.execute();

    response.json(products.map(toProductDto));
  });

  return router;
};

export const createQuoteRouter = (quoteCart: QuoteCartUseCase): Router => {
  const router = Router();

  router.post('/', async (request, response) => {
    const command = parseBodyOrThrow(quoteRequestSchema, request.body);
    const { cart, breakdown } = await quoteCart.execute({
      items: command.items,
      couponCode: command.couponCode ?? null,
    });

    response.json(toQuoteResponseDto(cart, breakdown));
  });

  return router;
};

export const createCheckoutRouter = (checkout: CheckoutUseCase): Router => {
  const router = Router();

  router.post('/', async (request, response) => {
    const command = parseBodyOrThrow(checkoutRequestSchema, request.body);
    const order = await checkout.execute({
      items: command.items,
      couponCode: command.couponCode ?? null,
    });

    // 201: el checkout crea un recurso nuevo y devuelve su representación.
    response.status(201).json(toOrderDto(order));
  });

  return router;
};

export const createOrdersRouter = (listOrders: ListOrdersUseCase): Router => {
  const router = Router();

  router.get('/', async (_request, response) => {
    const orders = await listOrders.execute();

    response.json(orders.map(toOrderDto));
  });

  return router;
};
