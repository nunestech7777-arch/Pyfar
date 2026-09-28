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
          blue: '#1e40af', // Deep rich electric blue from the mockup
          vibrant: '#2563eb',
          accent: '#3b82f6',
          light: '#eff6ff',
          dark: '#0f172a',
          sidebar: '#000000', // Jet black sidebar from reference
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 2px 12px -2px rgba(0, 0, 0, 0.05), 0 1px 4px -1px rgba(0, 0, 0, 0.03)',
        'card-hover': '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.03)',
        'blue-glow': '0 4px 20px -2px rgba(37, 99, 235, 0.35)',
      }
    },
  },
  plugins: [],
}
