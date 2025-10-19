import axios from 'axios';
import { GeocodedAddress } from './geolocation';

const VIACEP_URL = (cep: string) => `https://viacep.com.br/ws/${cep}/json/`;
const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";

export interface AddressSuggestion {
  label: string;
  address: string;
  lat: number;
  lon: number;
  placeId: string;
}

export function isCEP(query: string): boolean {
  const cleaned = query.replace(/\D/g, '');
  return cleaned.length === 8;
}

export function formatCEP(cep: string): string {
  const cleaned = cep.replace(/\D/g, '');
  if (cleaned.length !== 8) return cep;
  return cleaned.replace(/^(\d{5})(\d{3})$/, '$1-$2');
}

export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

async function fetchViaCEP(cep: string): Promise<GeocodedAddress | null> {
  try {
    const response = await axios.get(VIACEP_URL(cep));
    const data = response.data;

    if (data.erro) return null;

    // ViaCEP provides address details but not coordinates. We need to geocode the full address.
    const fullAddress = `${data.logradouro}, ${data.bairro}, ${data.localidade}, ${data.uf}`;
    const coords = await geocodeAddress(fullAddress);

    if (!coords) return null;

    return {
      street: data.logradouro || "",
      neighborhood: data.bairro || "",
      city: data.localidade || "",
      state: data.uf || "",
      cep: formatCEP(data.cep),
      lat: coords.lat,
      lon: coords.lon,
    };
  } catch (error) {
    console.error("ViaCEP fetch failed:", error);
    return null;
  }
}

export async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const url = `${NOMINATIM_SEARCH_URL}?format=json&q=${encodeURIComponent(address)}&limit=1`;
    const response = await axios.get(url);
    const data = response.data;

    if (data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
      };
    }
    return null;
  } catch (error) {
    console.error("Nominatim geocoding failed:", error);
    return null;
  }
}

export async function fetchAddressSuggestions(query: string): Promise<AddressSuggestion[]> {
  const cleanedQuery = query.trim();
  if (cleanedQuery.length < 3) return [];

  const suggestions: AddressSuggestion[] = [];

  // 1. Check for CEP (ViaCEP priority)
  if (isCEP(cleanedQuery)) {
    const cepData = await fetchViaCEP(cleanedQuery);
    if (cepData) {
      suggestions.push({
        label: `CEP: ${cepData.cep}`,
        address: `${cepData.street}, ${cepData.neighborhood}, ${cepData.city} - ${cepData.state}`,
        lat: cepData.lat,
        lon: cepData.lon,
        placeId: `cep-${cepData.cep}`,
      });
      return suggestions; // If CEP is found, return immediately as it's highly specific
    }
  }

  // 2. Nominatim Search (for street/address query)
  try {
    const url = `${NOMINATIM_SEARCH_URL}?format=json&q=${encodeURIComponent(cleanedQuery)}&limit=5&addressdetails=1`;
    const response = await axios.get(url);
    
    response.data.forEach((item: any) => {
      const address = item.address || {};
      const street = address.road || address.street || item.display_name.split(',')[0];
      const city = address.city || address.town || address.village || address.municipality || address.county || '';
      const state = address.state || '';
      const neighborhood = address.suburb || address.neighbourhood || '';

      let displayAddress = [street, neighborhood, city, state].filter(Boolean).join(', ');
      
      suggestions.push({
        label: item.display_name,
        address: displayAddress,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        placeId: item.place_id.toString(),
      });
    });
  } catch (error) {
    console.error("Nominatim suggestion fetch failed:", error);
  }

  return suggestions;
}