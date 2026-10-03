import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import unicorn from 'eslint-plugin-unicorn';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const outerLayers = ['**/application/**', '**/adapters/**', '**/ui/**'];
const libraries = ['react', 'react-dom', '@xyflow/*', 'zod'];
const testingFolders = ['**/testing/**'];
// Ids and timestamps are injected and storage sits behind ports, so inner layers never reach for these.
const browserGlobals = [
  'localStorage',
  'sessionStorage',
  'document',
  'window',
  'indexedDB',
  'crypto',
].map((name) => ({
  name,
  message: 'Inner layers stay free of browser globals; inject a port instead.',
}));
const noNewDate = {
  selector: "NewExpression[callee.name='Date']",
  message: 'Timestamps are injected; only main.tsx reads the clock.',
};

export default tseslint.config(
  { ignores: ['dist', 'playwright-report', 'test-results'] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        // The config file sits outside both tsconfig projects (src and e2e), so it is linted with defaults.
        projectService: { allowDefaultProject: ['playwright.config.ts'] },
        tsconfigRootDir: import.meta.dirname,
      },
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
      'no-restricted-imports': [
        'error',
        { patterns: [...outerLayers, ...libraries, 'zustand*', ...testingFolders] },
      ],
      'no-restricted-globals': ['error', ...browserGlobals],
      'no-restricted-syntax': ['error', noNewDate],
    },
  },
  {
    // Use cases depend on the domain and on ports only.
    files: ['src/application/**'],
    ignores: ['src/application/**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        // Only the vanilla store is framework-free; `zustand` itself pulls in React.
        {
          paths: [
            { name: 'zustand', message: 'Use zustand/vanilla; the root export pulls in React.' },
          ],
          patterns: [
            '**/adapters/**',
            '**/ui/**',
            ...libraries,
            ...testingFolders,
            'zustand/*',
            '!zustand/vanilla',
          ],
        },
      ],
      'no-restricted-globals': ['error', ...browserGlobals],
      'no-restricted-syntax': ['error', noNewDate],
    },
  },
  {
    // Adapters and the UI must not import test fixtures either; test files may.
    files: ['src/adapters/**', 'src/ui/**'],
    ignores: ['**/*.test.{ts,tsx}'],
    rules: { 'no-restricted-imports': ['error', { patterns: testingFolders }] },
  },
  {
    // Domain tests are the one place allowed to import the domain's test fixtures.
    files: ['src/domain/**/*.test.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [...outerLayers, ...libraries, 'zustand*'] }],
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
