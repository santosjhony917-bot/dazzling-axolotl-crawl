// src/types/user.ts

export interface UserSearchLocation {
  id?: string;
  address: string;
  latitude: number;
  longitude: number;
  cep?: string | null;
}