/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F0F5FA',
          100: '#E1ECF5',
          200: '#C3D9EB',
          300: '#94BCDC',
          400: '#5F99C9',
          500: '#3B82F6', // Accent
          600: '#315C85', // Secondary
          700: '#1E3A5F', // Primary Corporate Navy
          800: '#172D4A',
          900: '#101F33',
        },
        surface: '#FFFFFF',
        canvas: '#F6F8FB',
        mainText: '#172033',
        mutedText: '#687386',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 10px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02)',
        'premium': '0 10px 25px -5px rgba(30, 58, 95, 0.08), 0 8px 10px -6px rgba(30, 58, 95, 0.04)',
        'elevated': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      }
    },
  },
  plugins: [],
}
