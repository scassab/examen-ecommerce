import 'reflect-metadata';

import { loadConfig, loadEnvFile } from '../../../config/env';
import { createDataSource } from '../data-source';

/**
 * Ejecuta las migraciones pendientes.
 *
 * Se usa un script propio en lugar de la CLI de TypeORM porque la CLI resuelve
 * rutas relativas al paquete instalado, y en un monorepo con dependencias
 * elevadas a la raíz esa ruta cambia según dónde quede `typeorm`. Un script
 * explícito funciona igual desde la raíz que desde apps/backend.
 */
const run = async (): Promise<void> => {
  loadEnvFile();

  const dataSource = createDataSource(loadConfig().database);

  await dataSource.initialize();

  try {
    const executed = await dataSource.runMigrations({ transaction: 'all' });

    if (executed.length === 0) {
      console.info('[migrations] database already up to date');
      return;
    }

    for (const migration of executed) {
      console.info(`[migrations] applied ${migration.name}`);
    }
  } finally {
    await dataSource.destroy();
  }
};

run().catch((error: unknown) => {
  console.error('[migrations] failed', error);
  process.exit(1);
});
