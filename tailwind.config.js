/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
      },
      colors: {
        // shadcn/ui semantic tokens
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Gradient Able palette
        ga: {
          bg: '#ecf0f5',
          card: '#ffffff',
          sidebar: '#3f4d67',
          text: '#37474f',
          textMuted: '#78909c',
          border: '#e3e7ed',
          teal: { from: '#1de9b6', to: '#1dc4e9' },
          blue: { DEFAULT: '#04a9f5', dark: '#049ddb' },
          pink: '#f44236',
          purple: '#7c4dff',
          amber: { DEFAULT: '#f4c22b', dark: '#f4a72b' },
          success: '#1de9b6',
          warning: '#f4c22b',
          danger: '#f44236',
        },
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '16px',
      },
      boxShadow: {
        card: '0 2px 8px rgba(55, 71, 79, 0.08)',
        'card-hover': '0 4px 16px rgba(55, 71, 79, 0.12)',
      },
      ringColor: {
        DEFAULT: '#04a9f5',
      },
      ringOffsetColor: {
        DEFAULT: '#04a9f5',
      },
    },
  },
  plugins: [],
}
