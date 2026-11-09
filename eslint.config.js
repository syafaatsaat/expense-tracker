import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  globalIgnores(['dist', 'coverage']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // Pure logic never reads the clock or converts dates through UTC. "Today" is passed in.
    files: ['src/lib/**/*.ts', 'src/domain/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: 'Do not read the clock in pure logic. Take "today" as a parameter.',
        },
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: 'Do not read the clock in pure logic. Take "today" as a parameter.',
        },
        {
          selector:
            "NewExpression[callee.name='Date'][arguments.length=1][arguments.0.type='Literal']",
          message: 'new Date("YYYY-MM-DD") parses as UTC. Use LocalDate strings.',
        },
        {
          selector: "MemberExpression[property.name='toISOString']",
          message: 'toISOString() is UTC and shifts the date. Use toLocalDate().',
        },
      ],
    },
  },
  {
    files: ['**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  prettier,
);
