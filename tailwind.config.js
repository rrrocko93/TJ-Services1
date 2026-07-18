/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        tj: {
          gold: '#d4af37',
          'gold-dark': '#b8960c',
          amber: '#f59e0b',
        },
      },
    },
  },
  plugins: [],
};
