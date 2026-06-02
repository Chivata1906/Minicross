/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './eventos.html', './inscripcion.html', './panel-minicross-gestion-2026.html', './src/**/*.{js,ts}'],
  theme: {
    extend: {
      colors: {
        primary: '#06142B',
        secondary: '#00C2FF',
        accent: '#FFD400',
        orange: '#FF7A00',
        dark: '#02060D',
        'blue-medium': '#0B2F5B',
        'neon-light': '#3FE6FF',
        'gray-light': '#EAEAEA',
      },
      fontFamily: {
        title: ['"Bebas Neue"', 'Anton', 'Teko', 'sans-serif'],
        body: ['Montserrat', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 20px rgba(0, 194, 255, 0.4)',
        'glow-yellow': '0 0 20px rgba(255, 212, 0, 0.35)',
      },
    },
  },
  plugins: [],
};
