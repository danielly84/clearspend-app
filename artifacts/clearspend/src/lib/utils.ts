import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Visible focus indicator for keyboard users only (mouse clicks don't show it).
export const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}
