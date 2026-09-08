import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, parse } from 'node:path';

import { ConfigurationError, findEnvFile, loadConfig, loadEnvFile } from '../../src/infrastructure/config/env';

const completeEnvironment: NodeJS.ProcessEnv = {
  API_PORT: '4000',
  CORS_ORIGIN: 'http://localhost:4300',
  DB_HOST: 'localhost',
  DB_PORT: '5432',
  DB_USER: 'postgres',
  DB_PASSWORD: 'postgresql',
  DB_NAME: 'ecommerce',
  DB_TEST_SCHEMA: 'test',
};

const minimalEnvironment: NodeJS.ProcessEnv = {
  DB_HOST: 'localhost',
  DB_USER: 'postgres',
  DB_PASSWORD: '',
  DB_NAME: 'ecommerce',
};

describe('loadConfig', () => {
  it('groups the validated environment by area', () => {
    expect(loadConfig(completeEnvironment)).toEqual({
      api: { port: 4000, corsOrigin: 'http://localhost:4300' },
      database: {
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        password: 'postgresql',
        name: 'ecommerce',
        testSchema: 'test',
      },
    });
  });

  it('applies defaults for the variables that cannot cause harm', () => {
    const config = loadConfig(minimalEnvironment);

    expect(config.api).toEqual({ port: 3000, corsOrigin: 'http://localhost:4200' });
    expect(config.database.port).toBe(5432);
    expect(config.database.testSchema).toBe('test');
  });

  it('accepts an empty database password', () => {
    expect(() => loadConfig(minimalEnvironment)).not.toThrow();
  });

  it('coerces numeric variables that always arrive as strings', () => {
    const config = loadConfig({ ...completeEnvironment, API_PORT: '8080', DB_PORT: '6543' });

    expect(config.api.port).toBe(8080);
    expect(config.database.port).toBe(6543);
  });

  it.each<[string, NodeJS.ProcessEnv]>([
    ['the database host is missing', { ...minimalEnvironment, DB_HOST: undefined }],
    ['the database user is missing', { ...minimalEnvironment, DB_USER: undefined }],
    ['the database name is missing', { ...minimalEnvironment, DB_NAME: undefined }],
    ['the password is missing', { ...minimalEnvironment, DB_PASSWORD: undefined }],
    ['the api port is not a number', { ...minimalEnvironment, API_PORT: 'not-a-port' }],
    ['the api port is zero', { ...minimalEnvironment, API_PORT: '0' }],
    ['the api port is above the valid range', { ...minimalEnvironment, API_PORT: '70000' }],
    ['the database host is blank', { ...minimalEnvironment, DB_HOST: '' }],
  ])('refuses to start when %s', (_label, environment) => {
    expect(() => loadConfig(environment)).toThrow(ConfigurationError);
  });

  it('reports every offending variable with its path', () => {
    try {
      loadConfig({});
      throw new Error('expected loadConfig to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigurationError);
      const issues = error instanceof ConfigurationError ? error.issues : [];
      expect(issues.map((issue) => issue.path).sort()).toEqual([
        'DB_HOST',
        'DB_NAME',
        'DB_PASSWORD',
        'DB_USER',
      ]);
    }
  });

  it('mentions the offending variables in the error message', () => {
    expect(() => loadConfig({})).toThrow(/DB_HOST/);
  });
});

describe('findEnvFile', () => {
  const createNestedDirectories = (levels: number): { root: string; deepest: string } => {
    const root = mkdtempSync(join(tmpdir(), 'ecommerce-env-'));
    let deepest = root;

    for (let level = 0; level < levels; level += 1) {
      deepest = join(deepest, `level-${level}`);
    }

    mkdirSync(deepest, { recursive: true });

    return { root, deepest };
  };

  it('walks up from the working directory until it finds the file', () => {
    const { root, deepest } = createNestedDirectories(3);
    const envFile = join(root, '.env');
    writeFileSync(envFile, 'DB_HOST=localhost\n');

    expect(findEnvFile(deepest)).toBe(envFile);
  });

  it('finds the file when it sits in the starting directory', () => {
    const { root } = createNestedDirectories(0);
    const envFile = join(root, '.env');
    writeFileSync(envFile, 'DB_HOST=localhost\n');

    expect(findEnvFile(root)).toBe(envFile);
  });

  it('returns null when no file shows up within the lookup depth', () => {
    const { deepest } = createNestedDirectories(8);

    expect(findEnvFile(deepest)).toBeNull();
  });

  it('stops at the filesystem root instead of looping forever', () => {
    expect(findEnvFile(parse(tmpdir()).root)).toBeNull();
  });

  it('falls back to the working directory when no start directory is given', () => {
    const { deepest } = createNestedDirectories(8);
    const originalCwd = process.cwd();

    try {
      process.chdir(deepest);
      expect(findEnvFile()).toBeNull();
    } finally {
      process.chdir(originalCwd);
    }
  });
});

describe('loadConfig with the real process environment', () => {
  it('reads process.env when no source is provided', () => {
    const original = { ...process.env };
    Object.assign(process.env, minimalEnvironment);

    try {
      expect(loadConfig().database.name).toBe('ecommerce');
    } finally {
      process.env = original;
    }
  });
});

describe('loadEnvFile', () => {
  it('populates process.env from the file it finds', () => {
    const root = mkdtempSync(join(tmpdir(), 'ecommerce-env-'));
    writeFileSync(join(root, '.env'), 'ECOMMERCE_PROBE=loaded\n');

    const used = loadEnvFile(root);

    expect(used).toBe(join(root, '.env'));
    expect(process.env['ECOMMERCE_PROBE']).toBe('loaded');
    delete process.env['ECOMMERCE_PROBE'];
  });

  it('returns null and leaves the environment untouched when there is no file', () => {
    const { deepest } = { deepest: mkdtempSync(join(tmpdir(), 'ecommerce-noenv-')) };
    const nested = join(deepest, 'a', 'b', 'c', 'd', 'e', 'f', 'g');
    mkdirSync(nested, { recursive: true });

    expect(loadEnvFile(nested)).toBeNull();
  });

  it('falls back to the working directory when called without arguments', () => {
    const root = mkdtempSync(join(tmpdir(), 'ecommerce-cwd-'));
    writeFileSync(join(root, '.env'), 'ECOMMERCE_CWD_PROBE=loaded');
    const originalCwd = process.cwd();

    try {
      process.chdir(root);
      expect(loadEnvFile()).toBe(join(root, '.env'));
      expect(process.env['ECOMMERCE_CWD_PROBE']).toBe('loaded');
    } finally {
      process.chdir(originalCwd);
      delete process.env['ECOMMERCE_CWD_PROBE'];
    }
  });
});
