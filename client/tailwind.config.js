/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"DM Serif Display"', 'serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        surface: {
          DEFAULT: '#0f1117',
          raised: '#161b27',
          border: '#1e2535',
        },
        brand: {
          DEFAULT: '#3b82f6',
          dim: '#1d4ed8',
          glow: 'rgba(59,130,246,0.15)',
        },
        accent: '#22d3ee',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
      },
      boxShadow: {
        glow: '0 0 20px rgba(59,130,246,0.25)',
        'glow-sm': '0 0 8px rgba(59,130,246,0.15)',
      },
    },
  },
  plugins: [],
};

