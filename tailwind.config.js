/**
 * Tailwind v4 resolves its theme from CSS (`@theme` in src/index.css), not from this file.
 * It is kept as the shadcn/ui `components.json` target and as a place to declare future
 * v3-style plugins; it is NOT loaded unless you opt in with `@config "../tailwind.config.js";`
 * inside src/index.css.
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Geist Variable"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
