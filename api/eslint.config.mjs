// @ts-check
import js from '@eslint/js'
import prettier from 'eslint-config-prettier/flat'
import { defineConfig } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// Prettier owns formatting, ESLint only reports code issues
export default defineConfig(
  js.configs.recommended,
  tseslint.configs.recommended,
  { languageOptions: { globals: { ...globals.node, Bun: 'readonly' } } },
  prettier,
)
