import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from '@typescript-eslint/eslint-plugin'
import parser from '@typescript-eslint/parser'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs['flat/recommended'],
      reactHooks.configs.flat.recommended,
    ],
    languageOptions: {
      parser,
      parserOptions: {
        project: './tsconfig.app.json',
      },
      globals: globals.browser,
    },
  },
])
