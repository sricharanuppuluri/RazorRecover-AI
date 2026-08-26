/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F4F3FF',
          100: '#EBE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#6C63FF', // Primary Razorpay-inspired Purple
          600: '#5146D8', // Active/Hover Purple
          700: '#3B32B2',
          800: '#2A248A',
          900: '#1B1762',
        },
        razor: {
          dark: '#1A1F36',
          bg: '#F7F8FA',
          surface: '#FFFFFF',
          subtle: '#F9FAFB',
          border: '#E6E8EC',
          purple: '#6C63FF',
          purpleDark: '#5146D8',
          purpleLight: '#F4F3FF',
          secondary: '#697386',
          muted: '#8792A2',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
