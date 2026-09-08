import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import type { ValidationIssueDto } from '@ecommerce/shared';
import { validate } from '@ecommerce/shared';
import { config as readDotenvFile } from 'dotenv';
import { z } from 'zod';

/** Niveles que se recorren hacia arriba buscando el .env del monorepo. */
const MAX_LOOKUP_DEPTH = 6;

/**
 * Busca el archivo .env subiendo desde el directorio indicado.
 *
 * El .env vive en la raíz del monorepo, pero los comandos se lanzan tanto desde
 * la raíz como desde apps/backend. Resolver la ruta relativa a __dirname sería
 * frágil porque la profundidad cambia entre src/ y dist/, así que se busca hacia
 * arriba a partir del directorio de trabajo.
 */
export const findEnvFile = (startDirectory: string = process.cwd()): string | null => {
  let current = resolve(startDirectory);

  for (let depth = 0; depth < MAX_LOOKUP_DEPTH; depth += 1) {
    const candidate = join(current, '.env');

    if (existsSync(candidate)) {
      return candidate;
    }

    const parent = dirname(current);

    if (parent === current) {
      return null;
    }

    current = parent;
  }

  return null;
};

/** Carga el .env en process.env si existe, y devuelve la ruta usada. */
export const loadEnvFile = (startDirectory?: string): string | null => {
  const envFile = findEnvFile(startDirectory);

  if (envFile !== null) {
    readDotenvFile({ path: envFile, quiet: true });
  }

  return envFile;
};

/**
 * Esquema de las variables de entorno.
 *
 * Las variables de base de datos no tienen valor por defecto a propósito: es
 * preferible que el proceso no arranque a que arranque apuntando a un servidor
 * equivocado. Las que sí tienen defaults son las que no pueden causar daño.
 */
const environmentSchema = z.object({
  API_PORT: z.coerce.number().int().positive().max(65535).default(3000),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:4200'),
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().max(65535).default(5432),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string().min(1),
  DB_TEST_SCHEMA: z.string().min(1).default('test'),
});

export interface ApiConfig {
  readonly port: number;
  readonly corsOrigin: string;
}

export interface DatabaseConfig {
  readonly host: string;
  readonly port: number;
  readonly user: string;
  readonly password: string;
  readonly name: string;
  /** Esquema aislado que usan las pruebas de integración. */
  readonly testSchema: string;
}

/**
 * Configuración de la aplicación ya validada.
 *
 * Se expone agrupada por área en lugar de como un saco plano de variables: el
 * adaptador de persistencia recibe solo `database` y nunca ve el puerto HTTP.
 */
export interface AppConfig {
  readonly api: ApiConfig;
  readonly database: DatabaseConfig;
}

/** Error de arranque: la configuración es inválida y el proceso no debe seguir. */
export class ConfigurationError extends Error {
  public constructor(public readonly issues: readonly ValidationIssueDto[]) {
    const detail = issues.map((issue) => `${issue.path}: ${issue.message}`).join('; ');
    super(`invalid environment configuration -> ${detail}`);
    this.name = 'ConfigurationError';
  }
}

/**
 * Valida el entorno y devuelve la configuración tipada.
 *
 * Recibe la fuente por parámetro (por defecto `process.env`) para que las
 * pruebas no tengan que mutar el entorno global del proceso.
 */
export const loadConfig = (source: NodeJS.ProcessEnv = process.env): AppConfig => {
  const result = validate(environmentSchema, source);

  if (!result.success) {
    throw new ConfigurationError(result.issues);
  }

  const environment = result.data;

  return {
    api: {
      port: environment.API_PORT,
      corsOrigin: environment.CORS_ORIGIN,
    },
    database: {
      host: environment.DB_HOST,
      port: environment.DB_PORT,
      user: environment.DB_USER,
      password: environment.DB_PASSWORD,
      name: environment.DB_NAME,
      testSchema: environment.DB_TEST_SCHEMA,
    },
  };
};
