import { defineConfig } from 'eslint/config'

export default defineConfig([
  {
    rules: {
      'no-dupe-args': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ObjectPattern',
          message: 'Object destructuring is not allowed in function signatures.',
        },
      ],
    },
  },
])
