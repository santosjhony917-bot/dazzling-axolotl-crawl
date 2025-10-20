import axios from 'axios';
import { checkLocationPreference } from '@/components/LocationPermissionModal'; // Import the checkLocationPreference function

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";
const MOCK_LOCATION = { lat: -7.1195, lon: -34.8450 }; // João Pessoa, PB

interface AddressDetails {
  road?: string;
  street?: string;
  pedestrian?: string;
  footway?: string;
  path?: string; // Adicionado para fallback
  suburb?: string;
  neighbourhood?: string;
  quarter?: string;
  residential?: string;
  borough?: string; // Adicionado para fallback
  city_district?: string; // Adicionado para fallback
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state_district?: string; // Adicionado para fallback
  postcode?: string;
  state?: string;
}

export interface GeocodedAddress {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
  lat: number;
  lon: number;
}

// Helper para encontrar o melhor campo disponível
const findBestField = (details: AddressDetails, keys: (keyof AddressDetails)[]): string => {
  for (const key of keys) {
    if (details[key]) {
      return details[key] as string;
    }
  }
  return "";
};

export async function reverseGeocode(lat: number, lon: number): Promise<GeocodedAddress> {
  const url = `${NOMINATIM_URL}?format=jsonv2&lat=${lat}&lon=${lon}&addressdetails=1`;

  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'FilterFood Restaurant App', // Header customizado para Nominatim
    }
  });
  const data = response.data;

  if (!data || !data.address) {
    throw new Error("Failed to fetch reverse geocode data or address not found.");
  }

  const addr: AddressDetails = data.address || {};

  // Implementando fallbacks robustos
  const street = findBestField(addr, ['road', 'street', 'pedestrian', 'footway', 'path']);
  const neighborhood = findBestField(addr, ['suburb', 'neighbourhood', 'quarter', 'residential', 'borough', 'city_district']);
  const city = findBestField(addr, ['city', 'town', 'village', 'municipality', 'county', 'state_district']);
  const cep = addr.postcode || "";
  const state = addr.state || "";

  return {
    street,
    neighborhood,
    city,
    state,
    cep,
    lat,
    lon,
  };
}

export async function getCurrentLocationAddress(): Promise<GeocodedAddress> {
  const preference = checkLocationPreference();

  if (preference === 'mock') {
    console.warn("Using mock location based on user preference.");
    return reverseGeocode(MOCK_LOCATION.lat, MOCK_LOCATION.lon);
  }

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      console.warn("Geolocation is not supported by this browser. Falling back to mock location.");
      return resolve(reverseGeocode(MOCK_LOCATION.lat, MOCK_LOCATION.lon));
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const address = await reverseGeocode(latitude, longitude);
          resolve(address);
        } catch (error) {
          console.error("Reverse geocoding failed:", error);
          // If reverse geocoding fails, still try to use mock location as a last resort
          resolve(reverseGeocode(MOCK_LOCATION.lat, MOCK_LOCATION.lon));
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        // If geolocation fails, use mock location
        resolve(reverseGeocode(MOCK_LOCATION.lat, MOCK_LOCATION.lon));
      },
      options
    );
  });
}