// @ts-check
import prettier from 'eslint-config-prettier/flat'
import withNuxt from './.nuxt/eslint.config.mjs'

// Prettier owns formatting, ESLint only reports code issues
export default withNuxt(prettier)
