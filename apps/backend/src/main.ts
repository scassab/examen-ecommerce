import 'reflect-metadata';

import type { Server } from 'node:http';

import type { DataSource } from 'typeorm';

import { buildApiDependencies } from './infrastructure/composition-root';
import { ConfigurationError, loadConfig, loadEnvFile } from './infrastructure/config/env';
import { createApp } from './infrastructure/http/app';
import { createDataSource } from './infrastructure/persistence/typeorm/data-source';

/**
 * Cierra el servidor y la conexión a base de datos antes de morir.
 *
 * Sin esto, una petición en curso se corta a mitad y las conexiones quedan
 * abiertas hasta que PostgreSQL las expira, algo que se nota enseguida cuando
 * el servidor se reinicia varias veces durante una demostración.
 */
const shutdown = (server: Server, dataSource: DataSource): void => {
  server.close(() => {
    void dataSource.destroy().then(() => {
      console.info('[api] stopped');
      process.exit(0);
    });
  });
};

const bootstrap = async (): Promise<void> => {
  loadEnvFile();

  const config = loadConfig();
  const dataSource = createDataSource(config.database);

  await dataSource.initialize();
  console.info(`✅ connected to database ${config.database.name} at ${config.database.host}`);

  const app = createApp(config, buildApiDependencies(dataSource));
  const server = app.listen(config.api.port, () => {
    console.info(`🚀 listening on http://localhost:${config.api.port}`);
  });

  process.on('SIGINT', () => shutdown(server, dataSource));
  process.on('SIGTERM', () => shutdown(server, dataSource));
};

bootstrap().catch((error: unknown) => {
  if (error instanceof ConfigurationError) {
    console.error(`[api] ${error.message}`);
    process.exit(1);
  }

  console.error('[api] failed to start', error);
  process.exit(1);
});
