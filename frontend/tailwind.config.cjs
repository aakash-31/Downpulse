/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#080C14',       // Sleek dark space background
          card: '#0F1626',     // Card backdrop
          cardHover: '#151F36',// Card hover
          border: '#1F293D',   // Premium thin borders
          text: '#F3F4F6',     // Bright white text
          muted: '#8A99AD',    // Subdued gray text
          accent: '#1D4ED8'    // Deep blue highlights
        },
        brand: {
          up: '#10B981',       // Emerald UP status
          down: '#F43F5E',     // Rose DOWN status
          pending: '#F59E0B',  // Amber PENDING status
          latency: '#3B82F6',  // Blue latency indicator
          glow: 'rgba(16, 185, 129, 0.15)'
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      }
    },
  },
  plugins: [],
}
