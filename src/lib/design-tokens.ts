export const DESIGN_TOKENS = {
  colors: {
    brandBlue: "#1558A8",
    brandTeal: "#0C6B50",
    brandAmber: "#7A4C08",
    brandRed: "#962828",
    brandGreen: "#276040",
    surface: "#FFFFFF",
    surface2: "#F5F4F1",
    borderSoft: "#E2DFD8",
  },
  spacing: {
    1: "0.25rem",
    2: "0.5rem",
    3: "0.75rem",
    4: "1rem",
    6: "1.5rem",
    8: "2rem",
  },
  radius: {
    sm: "0.125rem",
    md: "0.375rem",
    lg: "0.5rem",
  },
  shadows: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  },
} as const

export const { colors, spacing, radius, shadows } = DESIGN_TOKENS

