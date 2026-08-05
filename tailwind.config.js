/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      backgroundImage: {
        'app-gradient':
          'radial-gradient(circle at 15% 15%, rgba(123, 31, 162, 0.2), transparent 35%), radial-gradient(circle at 80% 0%, rgba(255, 179, 0, 0.15), transparent 28%), linear-gradient(180deg, #0b1220 0%, #111827 45%, #0f172a 100%)',
      },
      boxShadow: {
        soft: '0 20px 55px rgba(2, 6, 23, 0.45)',
      },
    },
  },
  plugins: [],
}

