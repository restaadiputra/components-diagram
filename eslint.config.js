import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import unicorn from 'eslint-plugin-unicorn';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const outerLayers = ['**/application/**', '**/adapters/**', '**/ui/**'];
const libraries = ['react', 'react-dom', '@xyflow/*', 'zod'];

export default tseslint.config(
  { ignores: ['dist', 'playwright-report', 'test-results'] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      globals: globals.browser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { 'react-hooks': reactHooks, unicorn },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'unicorn/filename-case': ['error', { case: 'kebabCase' }],
      complexity: ['error', 10],
      'max-depth': ['error', 3],
      'max-params': ['error', 3],
      'max-lines-per-function': ['error', { max: 80, skipBlankLines: true, skipComments: true }],
      'max-lines': ['error', { max: 250, skipBlankLines: true, skipComments: true }],
      // Event handlers such as `() => setOpen(true)` are idiomatic React.
      '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
    },
  },
  {
    // The domain is plain TypeScript: no outer layers, no libraries.
    files: ['src/domain/**'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [...outerLayers, ...libraries, 'zustand*'] }],
    },
  },
  {
    // Use cases depend on the domain and on ports only.
    files: ['src/application/**'],
    ignores: ['src/application/**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: ['**/adapters/**', '**/ui/**', ...libraries] },
      ],
    },
  },
  {
    // A describe block holds many cases, so the size limits do not apply to test files.
    files: ['**/*.test.ts', 'e2e/**'],
    rules: { 'max-lines-per-function': 'off', 'max-lines': 'off' },
  },
  { files: ['eslint.config.js'], ...tseslint.configs.disableTypeChecked },
  prettier,
);
