/** @type {import('tailwindcss').Config} */
/** Semantic colors use hsl(var(--token)) — see src/index.css :root / .dark (HSL components, not raw colors). */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
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
        chart: {
          grid: "hsl(var(--chart-grid))",
          target: "hsl(var(--chart-target))",
          actual: "hsl(var(--chart-actual))",
          alt: "hsl(var(--chart-alt))",
        },
        "brand-blue": "hsl(var(--brand-blue))",
        "brand-teal": "hsl(var(--brand-teal))",
        "brand-amber": "hsl(var(--brand-amber))",
        "brand-red": "hsl(var(--brand-red))",
        "brand-green": "hsl(var(--brand-green))",
        surface: "hsl(var(--surface))",
        "surface-2": "hsl(var(--surface-2))",
        "border-soft": "hsl(var(--border-soft))",
      },
      spacing: {
        1: "0.25rem",
        2: "0.5rem",
        3: "0.75rem",
        4: "1rem",
        6: "1.5rem",
        8: "2rem",
      },
      borderRadius: {
        sm: "0.125rem",
        md: "0.375rem",
        lg: "0.5rem",
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
        lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
      },
      fontFamily: {
        sans: ["DM Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["DM Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  safelist: [
    "bg-green-100",
    "text-green-800",
    "border-green-200",
    "bg-amber-100",
    "text-amber-800",
    "border-amber-200",
    "bg-red-100",
    "text-red-800",
    "border-red-200",
    "bg-green-500",
    "bg-amber-500",
    "bg-red-500",
    "border-emerald-200",
    "bg-emerald-50",
    "text-emerald-700",
    "border-amber-200",
    "bg-amber-50",
    "text-amber-700",
    "border-red-200",
    "bg-red-50",
    "text-red-700",
  ],
  plugins: [],
}
