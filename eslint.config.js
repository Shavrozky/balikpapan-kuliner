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
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },

  /*
   * shadcn/ui primitives (src/components/ui/**) are vendored, generated files: they
   * intentionally co-export their `cva` variant maps (`buttonVariants`, `badgeVariants`)
   * and `import * as React` for the JSX runtime. Regenerating via the shadcn CLI would
   * re-introduce both, so relaxing the two rules here — instead of hand-editing vendored
   * code — is what survives the next `npx shadcn add`.
   */
  {
    files: ['src/components/ui/**/*.{js,jsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
      'no-unused-vars': ['error', { varsIgnorePattern: '^React$' }],
    },
  },

  /*
   * A React context module is the one place where a Provider component and its consumer
   * hook legitimately live together — splitting them would mean exporting the raw context
   * object across files, which is worse for encapsulation. Permit the hook names instead.
   */
  {
    files: ['src/context/**/*.{js,jsx}'],
    rules: {
      'react-refresh/only-export-components': [
        'error',
        { allowExportNames: ['useDiary', 'useDiaryStats', 'useDiaryPlaces', 'useDiaryTags'] },
      ],
    },
  },
])
