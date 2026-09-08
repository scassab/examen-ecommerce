import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'jest.config.js'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // El enunciado prohibe `any` sin justificacion tecnica: se degrada a error
      // para que el linter falle antes de que llegue a una revision.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      // Express identifica un manejador de errores por su aridad de 4
      // parametros, asi que `next` debe declararse aunque no se use: el prefijo
      // con guion bajo marca esa intencion, igual que hace TypeScript.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      'no-console': ['error', { allow: ['error', 'warn', 'info'] }],
    },
  },
);
