import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  ignores: ['backend-ref/**', 'output/**', '.output/**', 'playwright-report/**', 'test-results/**'],
})
