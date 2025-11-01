// src/types/user.ts

export interface UserSearchLocation {
  id?: string;
  address: string;
  latitude: number;
  longitude: number;
  cep?: string | null;
  formattedAddress?: string; // Add formattedAddress
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
}