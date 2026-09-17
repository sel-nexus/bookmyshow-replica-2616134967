import type { Config } from 'tailwindcss';

/** Defines the cinema palette and keeps Tailwind scoped to auth UI files. */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#121212',
        paper: '#fffdf9',
        cinema: '#d9272e',
        ember: '#a71921'
      },
      boxShadow: {
        cinema: '0 24px 60px rgba(18, 18, 18, 0.14)',
        lift: '0 12px 28px rgba(217, 39, 46, 0.2)'
      }
    }
  },
  plugins: []
};

export default config;
