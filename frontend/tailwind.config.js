/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        gold: 'var(--gold)',
        sage: 'var(--sage)',
        terracotta: 'var(--terracotta)',
        ink: 'var(--ink)',
        cream: 'var(--cream)',
        'warm-gray': 'var(--warm-gray)',
        'sidebar-bg': 'var(--sidebar-bg)',
        'sidebar-text': 'var(--sidebar-text)',
        'card-bg': 'var(--card-bg)',
        'card-border': 'var(--card-border)',
        'input-bg': 'var(--input-bg)',
        'input-border': 'var(--input-border)',
        'chart-interest': 'var(--chart-interest)',
        'chart-principal': 'var(--chart-principal)',
        'chart-escrow': 'var(--chart-escrow)',
        danger: 'var(--danger)',
        success: 'var(--success)',
      },
      fontFamily: {
        serif: ['"DM Serif Display"', 'serif'],
        sans: ['"DM Sans"', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
      },
    },
  },
  plugins: [],
};
