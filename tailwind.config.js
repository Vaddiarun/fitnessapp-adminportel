/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Same palette and fonts as the AI Fitness app.
      colors: {
        bg: '#F3F3F4', surface: '#FFFFFF', sunk: '#EBEBED', ink: '#0B0B0C', muted: '#68686F', line: '#E1E1E5',
        accent: '#FF4F00', 'accent-soft': '#FFE9DF', good: '#00A36C', 'good-soft': '#DDF5EB', warn: '#B45309', 'warn-soft': '#FEF3C7',
      },
      fontFamily: {
        body: ['Archivo', 'system-ui', 'sans-serif'],
        display: ['"Barlow Condensed"', 'Archivo', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
