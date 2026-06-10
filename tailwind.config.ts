import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Poppins", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
        display: ["Poppins", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // Cores customizadas do novo design
        "highlight": "hsl(var(--highlight))", 
        "magic-feature": "hsl(var(--magic-feature))",
        "background-light": "hsl(var(--background-light))", 
        "background-dark": "#111821", // Mantido, mas não usado no modo light
        "text-primary": "hsl(var(--primary))", // Novo alias para a cor primária de texto
        "text-secondary": "hsl(var(--text-secondary))", // Novo alias para texto secundário
        "text-light": "#111417",
        "text-dark": "#ffffff",
        "orange-accent": "24 84.2% 60.2%",
        "orange-accent-hover": "24 90% 55%",
      },
      borderRadius: {
        lg: "1rem", // 16px
        md: "0.75rem", // 12px
        sm: "0.5rem", // 8px
        xl: "1.25rem", // 20px (Novo padrão para cards)
        "2xl": "1.5rem", // 24px (Para elementos maiores)
        DEFAULT: "1rem",
      },
      boxShadow: {
        // Sombras desativadas para garantir o padrão plano (Flat & Clean)
        sm: 'none',
        DEFAULT: 'none',
        md: 'none',
        lg: 'none',
        xl: 'none',
        '2xl': 'none',
        inner: 'none',
        'soft-sm': 'none',
        'soft-md': 'none',
        'soft-lg': 'none',
        'soft-xl': 'none',
        'highlight-glow': 'none',
        soft: 'var(--soft-shadow)',
        float: 'var(--float-shadow)',
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        // Animação de brilho para botões (usada em globals.css)
        "shine": {
          "0%": { "background-position": "-200% 0" },
          "100%": { "background-position": "200% 0" },
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "shine": "shine 3s infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;