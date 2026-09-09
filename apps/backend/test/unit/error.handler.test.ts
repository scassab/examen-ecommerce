import type { NextFunction, Request, Response } from 'express';

import { errorHandler } from '../../src/infrastructure/http/middlewares/error.handler';

interface ResponseDouble {
  readonly response: Response;
  readonly status: jest.Mock;
  readonly json: jest.Mock;
}

/**
 * Doble de Response con lo mínimo que usa el manejador. Se convierte mediante
 * `unknown` en lugar de `any` para no perder la comprobación de tipos del resto
 * de la prueba.
 */
const createResponseDouble = (): ResponseDouble => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });

  return { response: { status } as unknown as Response, status, json };
};

const request = {} as Request;
const next: NextFunction = jest.fn();

describe('errorHandler', () => {
  it('translates an unexpected error into a stable 500 contract', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { response, status, json } = createResponseDouble();

    errorHandler(new Error('database exploded'), request, response, next);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      code: 'INTERNAL_ERROR',
      message: 'unexpected error while processing the request',
    });
    consoleSpy.mockRestore();
  });

  it('logs the original error on the server side', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { response } = createResponseDouble();
    const original = new Error('database exploded');

    errorHandler(original, request, response, next);

    expect(consoleSpy).toHaveBeenCalledWith('[api] unhandled error', original);
    consoleSpy.mockRestore();
  });

  it('reports a malformed JSON body as a client error', () => {
    const { response, status, json } = createResponseDouble();
    const malformed = Object.assign(new SyntaxError('Unexpected end of JSON input'), { body: '{' });

    errorHandler(malformed, request, response, next);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      code: 'INVALID_PAYLOAD',
      message: 'the request body is not valid JSON',
      issues: [{ path: 'body', message: 'Unexpected end of JSON input' }],
    });
  });

  it('treats a plain syntax error as unexpected, not as a bad payload', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { response, status } = createResponseDouble();

    errorHandler(new SyntaxError('unrelated'), request, response, next);

    expect(status).toHaveBeenCalledWith(500);
    consoleSpy.mockRestore();
  });
});
