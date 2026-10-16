/**
 * Tailwind v4 with the `@tailwindcss/vite` plugin does NOT need the PostCSS `tailwindcss`
 * plugin — pointing it there is what broke `vite build` (`The PostCSS plugin has moved to a
 * separate package`). The Vite plugin owns CSS generation, so only real PostCSS plugins that
 * Vite does not already apply belong here. `autoprefixer` is safe + installed.
 */
export default {
  plugins: {
    autoprefixer: {},
  },
}
