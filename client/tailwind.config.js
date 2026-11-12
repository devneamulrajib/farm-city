/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ocean: {
          50: '#f3f7fb',
          100: '#e4eef6',
          200: '#c5d9ea',
          300: '#93b8d6',
          400: '#5a90bb',
          500: '#3673a0',
          600: '#255a84',
          700: '#1d496c',
          800: '#12344f',
          900: '#0c283d',
          950: '#071926',
        },
        kelp: {
          50: '#eef8f3',
          100: '#d7f0e4',
          600: '#1c7a56',
          700: '#146348',
        },
        sand: '#f4f1ea',
        ink: '#14202b',
      },
      fontFamily: {
        sans: ['Outfit', 'Noto Sans Bengali', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 24px 50px -28px rgba(7, 25, 38, 0.35)',
        soft: '0 10px 30px -18px rgba(7, 25, 38, 0.18)',
      },
      maxWidth: {
        page: '80rem',
      },
    },
  },
  plugins: [],
};
