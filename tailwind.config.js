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
        maroon: {
          50: '#fdf2f2',
          100: '#fbe5e5',
          200: '#f8d0d0',
          300: '#f1adad',
          400: '#e57b7b',
          500: '#d54d4d',
          600: '#b83232',
          700: '#942222',
          800: '#7a1e1e',
          900: '#5a1717',
          950: '#340a0a',
        },
        gold: {
          50: '#fbf9ed',
          100: '#f6f2d2',
          200: '#eee3a5',
          300: '#e3ce6f',
          400: '#d7b73f',
          500: '#c89d23',
          600: '#af7e1b',
          700: '#8c5d18',
          800: '#744a1b',
          900: '#643f1c',
          950: '#3b210c',
        }
      },
      fontFamily: {
        cairo: ['Cairo', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
