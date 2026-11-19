/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f6f7f9',
          100: '#eaecef',
          200: '#d5d9e0',
          400: '#8a93a3',
          600: '#4c5568',
          800: '#232a38',
          900: '#161b26'
        },
        accent: {
          50: '#eef4ff',
          100: '#d9e6ff',
          500: '#3565d8',
          600: '#2a51b8',
          700: '#23439a'
        }
      }
    }
  },
  plugins: []
}
