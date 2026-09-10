/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'navy-bg': '#07111F',
        'navy-surface': '#0D1B2A',
        'navy-card': '#12243A',
        'cyan-accent': '#22D3EE',
        'blue-accent': '#3B82F6',
        'off-white': '#F1F5F9',
        'slate-muted': '#94A3B8',
        'navy-border': '#243B53',
        'verdict-supported': '#22C55E',
        'verdict-contradicted': '#EF4444',
        'verdict-inconclusive': '#94A3B8'
      },
      animation: {
        'intro-scale-up': 'introScaleUp 4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'intro-fade-out': 'introFadeOut 4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in-content': 'fadeInContent 1s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scanline': 'scanline 2s linear infinite',
      },
      keyframes: {
        introScaleUp: {
          '0%': { opacity: 0, transform: 'scale(0.9) translateY(20px)' },
          '10%': { opacity: 1, transform: 'scale(1) translateY(0)' },
          '85%': { opacity: 1, transform: 'scale(1) translateY(0)' },
          '100%': { opacity: 0, transform: 'scale(1.1) translateY(-20px)' },
        },
        introFadeOut: {
          '0%': { opacity: 1, backdropFilter: 'blur(10px)' },
          '85%': { opacity: 1, backdropFilter: 'blur(10px)' },
          '100%': { opacity: 0, backdropFilter: 'blur(0px)' },
        },
        fadeInContent: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        scanline: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(200%)' }
        }
      }
    },
  },
  plugins: [],
}
