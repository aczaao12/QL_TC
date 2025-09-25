import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  // New configuration for Firebase Functions
  {
    files: ['functions/**/*.js'], // Target files in the functions directory
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node, // Enable Node.js global variables
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'commonjs', // Functions typically use CommonJS modules
      },
    },
    rules: {
      // You might want to add specific rules for Node.js environment here
    },
  },
])
