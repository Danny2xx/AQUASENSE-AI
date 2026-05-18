/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        status: {
          green: '#22c55e',
          watch: '#3b82f6',
          amber: '#f59e0b',
          red: '#ef4444',
        },
      },
    },
  },
  plugins: [],
};
