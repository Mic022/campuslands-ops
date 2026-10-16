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
        holo: {
          void: '#030712',
          card: 'rgba(9, 14, 29, 0.75)',
          panel: 'rgba(11, 19, 39, 0.85)',
          border: 'rgba(255, 255, 255, 0.08)',
          cyan: '#00F5FF',
          violet: '#9D4EDD',
          pink: '#FF007A',
          mint: '#00FF9D',
          amber: '#FFB703',
          crimson: '#FF2A55',
          glow: '#38BDF8'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      },
      backgroundImage: {
        'holo-gradient': 'linear-gradient(135deg, rgba(0, 245, 255, 0.15) 0%, rgba(157, 78, 221, 0.15) 50%, rgba(255, 0, 122, 0.15) 100%)',
        'aurora-glow': 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(120, 119, 198, 0.3), rgba(255, 255, 255, 0))',
      },
      animation: {
        'scanline': 'scanline 6s linear infinite',
        'pulse-glow': 'pulse-glow 2.5s ease-in-out infinite alternate',
        'holo-float': 'holo-float 4s ease-in-out infinite',
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        },
        'pulse-glow': {
          '0%': { opacity: '0.4', filter: 'drop-shadow(0 0 10px rgba(0, 245, 255, 0.4))' },
          '100%': { opacity: '0.9', filter: 'drop-shadow(0 0 25px rgba(157, 78, 221, 0.8))' },
        },
        'holo-float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      }
    },
  },
  plugins: [],
}
