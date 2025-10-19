import axios from 'axios';

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";
const MOCK_LOCATION = { lat: -7.1195, lon: -34.8450 }; // João Pessoa, PB

interface AddressDetails {
  road?: string;
  street?: string;
  pedestrian?: string;
  footway?: string;
  suburb?: string;
  neighbourhood?: string;
  quarter?: string;
  residential?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
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

// Helper to find the best available field for a location component
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

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch reverse geocode data.");
  }
  const data = await response.json();

  const details: AddressDetails = data.address || {};

  const street = findBestField(details, ['road', 'street', 'pedestrian', 'footway']);
  const neighborhood = findBestField(details, ['suburb', 'neighbourhood', 'quarter', 'residential']);
  const city = findBestField(details, ['city', 'town', 'village', 'municipality', 'county']);
  const cep = details.postcode || "";
  const state = details.state || "";

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
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      console.warn("Geolocation is not supported by this browser. Using mock location.");
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
          reject(new Error("Failed to determine address from coordinates."));
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        
        // Handle specific errors and fallback to mock location
        if (error.code === error.PERMISSION_DENIED) {
          console.warn("Permission denied. Using mock location.");
          resolve(reverseGeocode(MOCK_LOCATION.lat, MOCK_LOCATION.lon));
        } else if (error.code === error.POSITION_UNAVAILABLE || error.code === error.TIMEOUT) {
          console.warn("Position unavailable or timeout. Using mock location.");
          resolve(reverseGeocode(MOCK_LOCATION.lat, MOCK_LOCATION.lon));
        } else {
          reject(new Error(`Geolocation failed: ${error.message}`));
        }
      },
      options
    );
  });
}