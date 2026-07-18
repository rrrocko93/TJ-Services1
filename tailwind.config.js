/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        tj: {
          silver: '#c0c0c0',
          'silver-dark': '#808080',
        },
      },
    },
  },
  plugins: [],
};
