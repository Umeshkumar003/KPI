import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { RAGStatus } from "@/types/kpi.types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  const sign = value < 0 ? "-" : ""
  const abs = Math.abs(value)

  if (abs >= 1_000_000) {
    const m = abs / 1_000_000
    const rounded = Math.round(m * 10) / 10 // 1 decimal place
    const asStr = rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)
    return `${sign}$${asStr}M`
  }

  if (abs >= 1_000) {
    return `${sign}$${Math.round(abs / 1_000)}K`
  }

  return `${sign}$${Math.round(abs)}`
}

export function formatAttainment(pct: number): string {
  return `${pct.toFixed(1)}%`
}

/**
 * Derive RAG status from an attainment percentage.
 *
 * `green` and `amber` are expected to be attainment thresholds (in %).
 */
export function getRAGStatus(actual: number, target: number, green: number, amber: number): RAGStatus {
  if (target === 0) {
    if (actual === 0) return "green"
    return actual > 0 ? "green" : "red"
  }

  const attainmentPct = (actual / target) * 100

  if (attainmentPct >= green) return "green"
  if (attainmentPct >= amber) return "amber"
  return "red"
}

/**
 * Generate a hyphenated code from the first letters of each word.
 * Example: "On-time Delivery" -> "OTD"
 */
export function generateCode(name: string): string {
  const words = name.match(/[A-Za-z0-9]+/g) ?? []
  return words
    .map((w) => w.trim())
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase())
    .join("-")
}

/**
 * Normalize a code to "UPPERCASE" with non-alphanumerics converted to hyphens.
 * Example: "rev tot" -> "REV-TOT"
 */
export function normalizeCode(code: string): string {
  return code
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "")
}

export function autoDistribute(annual: number): { h1: number; h2: number; q1: number; q2: number; q3: number; q4: number } {
  const h1 = Math.round(annual / 2)
  const h2 = Math.round(annual / 2)
  const q1 = Math.round(annual / 4)
  const q2 = Math.round(annual / 4)
  const q3 = Math.round(annual / 4)
  const q4 = Math.round(annual / 4)

  return { h1, h2, q1, q2, q3, q4 }
}
