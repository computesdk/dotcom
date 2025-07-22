/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          light: '#4ade80',
          DEFAULT: '#19874d',
          dark: '#14532d',
        },
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: true,
  },
}
