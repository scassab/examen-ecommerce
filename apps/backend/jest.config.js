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
  // main.ts solo arranca el proceso: se excluye porque probarlo exigiria
  // levantar un servidor real sin aportar valor sobre las pruebas de createApp.
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts'],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: { branches: 80, functions: 80, lines: 80, statements: 80 },
  },
};
