import 'reflect-metadata';

import { DataSource } from 'typeorm';

import type { DatabaseConfig } from '../../config/env';
import { loadConfig, loadEnvFile } from '../../config/env';

import { CategoryEntity, CouponEntity, ProductEntity } from './entities/catalog.entities';
import { OrderDiscountEntity, OrderEntity, OrderItemEntity } from './entities/order.entities';
import { InitialSchema1788825600000 } from './migrations/1788825600000-initial-schema';

/** Esquema por defecto de PostgreSQL. */
export const DEFAULT_SCHEMA = 'public';

export interface DataSourceOverrides {
  /** Esquema alternativo; las pruebas de integración usan uno aislado. */
  readonly schema?: string;
}

/**
 * Construye el `DataSource` a partir de la configuración validada.
 *
 * Las entidades y migraciones se importan explícitamente en lugar de buscarse
 * con patrones de ruta: los globs se rompen al pasar de `src` a `dist` y
 * producen el clásico "no entities found" en producción, que además no se
 * detecta hasta el despliegue.
 *
 * `synchronize` queda desactivado siempre: el esquema lo gobiernan las
 * migraciones.
 */
export const createDataSource = (
  database: DatabaseConfig,
  overrides: DataSourceOverrides = {},
): DataSource =>
  new DataSource({
    type: 'postgres',
    host: database.host,
    port: database.port,
    username: database.user,
    password: database.password,
    database: database.name,
    schema: overrides.schema ?? DEFAULT_SCHEMA,
    entities: [
      CategoryEntity,
      ProductEntity,
      CouponEntity,
      OrderEntity,
      OrderItemEntity,
      OrderDiscountEntity,
    ],
    migrations: [InitialSchema1788825600000],
    synchronize: false,
    logging: false,
  });

/**
 * `DataSource` que consume la CLI de TypeORM para ejecutar migraciones.
 *
 * Es el único sitio del proyecto que lee el entorno por su cuenta, porque la
 * CLI no pasa por el arranque de la aplicación.
 */
loadEnvFile();

export default createDataSource(loadConfig().database);
