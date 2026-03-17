/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1B2B4B',
          50: '#E8ECF3',
          100: '#C5CFDF',
          200: '#9EAFC9',
          300: '#778FB3',
          400: '#5572A0',
          500: '#3A5A8C',
          600: '#2E4A75',
          700: '#243B5F',
          800: '#1B2B4B',
          900: '#111C31',
        },
        primary: {
          DEFAULT: '#1B2B4B',
          foreground: '#FFFFFF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
