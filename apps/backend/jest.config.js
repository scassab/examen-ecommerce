/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  transform: {
    '^.+\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  // El paquete compartido se resuelve contra su codigo fuente para que las
  // pruebas no dependan de que exista un build previo de packages/shared.
  moduleNameMapper: {
    '^@ecommerce/shared$': '<rootDir>/../../packages/shared/src/index.ts',
  },
  // Se excluye el codigo de arranque y de esquema, que no contiene reglas: main.ts
  // solo levanta el proceso, y data-source, migraciones y semillas se verifican
  // ejecutandolos contra PostgreSQL y en las pruebas de integracion.
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/main.ts',
    '!src/infrastructure/persistence/typeorm/data-source.ts',
    '!src/infrastructure/persistence/typeorm/migrations/**',
    '!src/infrastructure/persistence/typeorm/seeds/run-seed.ts',
  ],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: { branches: 80, functions: 80, lines: 80, statements: 80 },
  },
};
