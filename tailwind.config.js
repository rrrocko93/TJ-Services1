/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bronze: {
          50: '#fdf6ed',
          100: '#f7e8cd',
          200: '#ecd0a0',
          300: '#e0b574',
          400: '#cd9a4a',
          500: '#b8823a',
          600: '#9a6a2e',
          700: '#7c5324',
          800: '#5e3f1d',
          900: '#3f2a15',
          950: '#2a1c0e',
        },
      },
    },
  },
  plugins: [],
};
