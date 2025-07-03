/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gray: {
          50: '#f9fafb',
          900: '#111827',
          950: '#030712',
        },
      },
      fontFamily: {
        sans: ['Reddit Mono', 'sans-serif'],
        // or as a custom name
        'reddit-mono': ['Reddit Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};