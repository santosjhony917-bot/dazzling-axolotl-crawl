import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats address parts into a summary string.
 * @param addressParts An object containing address components like city and state.
 * @returns A formatted address summary string.
 */
export const formatAddressSummary = (addressParts: { city?: string | null; state?: string | null }): string => {
  const parts = [];
  if (addressParts.city) {
    parts.push(addressParts.city);
  }
  if (addressParts.state) {
    parts.push(addressParts.state);
  }
  return parts.join(', ');
};