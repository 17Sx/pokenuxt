// @ts-check
import prettier from 'eslint-config-prettier/flat'
import withNuxt from './.nuxt/eslint.config.mjs'

// Prettier owns formatting, ESLint only reports code issues. The API in api/
// has its own config and its own CI.
export default withNuxt(
  { ignores: ['api/**', 'infra/cdk.out/**', 'coverage/**'] },
  prettier,
)
