import axios from 'axios';

export interface GeocodedAddress {
  formattedAddress: string;
  lat: number;
  lon: number;
}

/**
 * Geocodes a full address string into latitude and longitude coordinates.
 * Uses the Nominatim API (OpenStreetMap).
 */
export async function geocodeAddress(address: string): Promise<GeocodedAddress | null> {
  if (!address) return null;

  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: address,
        format: 'json',
        limit: 1,
      },
    });

    if (response.data && response.data.length > 0) {
      const result = response.data[0];
      return {
        formattedAddress: result.display_name,
        lat: parseFloat(result.lat),
        lon: parseFloat(result.lon),
      };
    }
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

/**
 * Formats a raw string into a standard CEP format (00000-000).
 */
export function formatCEP(rawCep: string): string {
  const cleaned = rawCep.replace(/\D/g, '');
  if (cleaned.length > 5) {
    return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 8)}`;
  }
  return cleaned;
}

/**
 * Formats a distance in kilometers to a user-friendly string.
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    // Convert to meters if less than 1 km
    return `${(distanceKm * 1000).toFixed(0)} m`;
  }
  // Show in kilometers with one decimal place
  return `${distanceKm.toFixed(1)} km`;
}