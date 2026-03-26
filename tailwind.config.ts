import type { Config } from "tailwindcss"
import jsConfig from "./tailwind.config.js"

/** Single source of truth: `tailwind.config.js` (PostCSS / Vite use this). */
export default jsConfig as Config
