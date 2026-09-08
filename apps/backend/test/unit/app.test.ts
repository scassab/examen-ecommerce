import { API_ROUTES } from '@ecommerce/shared';
import request from 'supertest';

import type { AppConfig } from '../../src/infrastructure/config/env';
import { createApp } from '../../src/infrastructure/http/app';

const config: AppConfig = {
  api: { port: 3000, corsOrigin: 'http://localhost:4200' },
  database: {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgresql',
    name: 'ecommerce',
    testSchema: 'test',
  },
};

const app = createApp(config);

describe('createApp', () => {
  it('answers the health check with the service status', async () => {
    const response = await request(app).get(API_ROUTES.health);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok' });
    expect(typeof response.body.uptimeInSeconds).toBe('number');
    expect(Date.parse(response.body.timestamp)).not.toBeNaN();
  });

  it('answers an unknown route with the shared error envelope', async () => {
    const response = await request(app).get('/api/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      code: 'ROUTE_NOT_FOUND',
      message: 'no route matches GET /api/does-not-exist',
    });
  });

  it('rejects a malformed JSON body without leaking the stack trace', async () => {
    const response = await request(app)
      .post(API_ROUTES.quote)
      .set('Content-Type', 'application/json')
      .send('{"items": [');

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_PAYLOAD');
    expect(response.body.issues).toHaveLength(1);
    expect(response.text).not.toContain('at Object');
  });

  it('allows requests coming from the configured frontend origin', async () => {
    const response = await request(app)
      .get(API_ROUTES.health)
      .set('Origin', 'http://localhost:4200');

    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:4200');
  });

  it('does not advertise the underlying framework', async () => {
    const response = await request(app).get(API_ROUTES.health);

    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});
