import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import prettier from 'eslint-config-prettier/flat'

const config = [
  { ignores: ['.next/', 'coverage/', 'project_venv/', 'next-env.d.ts'] },
  ...nextCoreWebVitals,
  prettier,
  {
    rules: {
      eqeqeq: ['error', 'smart'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },
]

export default config
