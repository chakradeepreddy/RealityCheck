/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'intro-scale-up': 'introScaleUp 2.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'intro-fade-out': 'introFadeOut 2.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in-content': 'fadeInContent 1s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        introScaleUp: {
          '0%': { opacity: 0, transform: 'scale(0.9) translateY(20px)' },
          '20%': { opacity: 1, transform: 'scale(1) translateY(0)' },
          '80%': { opacity: 1, transform: 'scale(1) translateY(0)' },
          '100%': { opacity: 0, transform: 'scale(1.1) translateY(-20px)' },
        },
        introFadeOut: {
          '0%': { opacity: 1, backdropFilter: 'blur(10px)' },
          '80%': { opacity: 1, backdropFilter: 'blur(10px)' },
          '100%': { opacity: 0, backdropFilter: 'blur(0px)' },
        },
        fadeInContent: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        }
      }
    },
  },
  plugins: [],
}
