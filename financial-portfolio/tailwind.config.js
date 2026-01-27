/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        surface: {
          light: 'rgba(255, 255, 255, 0.8)',
          dark: 'rgba(30, 30, 40, 0.8)',
        }
      },
      backdropBlur: {
        xs: '2px',
      },
      fontFamily: {
        hebrew: ['Heebo', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
