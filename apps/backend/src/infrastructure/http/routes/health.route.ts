import { Router } from 'express';

/** Respuesta del endpoint de salud, usada por la demo para comprobar el arranque. */
export interface HealthResponse {
  readonly status: 'ok';
  readonly uptimeInSeconds: number;
  readonly timestamp: string;
}

export const createHealthRouter = (): Router => {
  const router = Router();

  router.get('/', (_request, response) => {
    const body: HealthResponse = {
      status: 'ok',
      uptimeInSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };

    response.json(body);
  });

  return router;
};
