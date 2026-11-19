/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        // 暖纸色（电子墨水底）
        paper: {
          50: '#faf8f2',
          100: '#f3efe4',
          200: '#e9e3d3',
          300: '#d8cfb8'
        },
        // 墨色（暖调深灰）
        ink: {
          50: '#f4f3ef',
          100: '#e6e4dd',
          200: '#cfcbbf',
          300: '#a8a394',
          400: '#837e6f',
          500: '#6b665a',
          600: '#55514a',
          700: '#403d37',
          800: '#2c2a26',
          900: '#1d1b18'
        },
        // 朱砂（暖色强调）
        accent: {
          50: '#fbf1ea',
          100: '#f5ddcd',
          200: '#eabfa2',
          500: '#c05f2a',
          600: '#a54e1f',
          700: '#86401b'
        }
      },
      fontFamily: {
        serif: ['Georgia', '"Times New Roman"', '"Songti SC"', 'STSong', 'SimSun', 'serif'],
        sans: ['"Helvetica Neue"', 'Arial', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif']
      }
    }
  },
  plugins: []
}
