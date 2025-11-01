import { Database } from "./database.types";

export type Restaurant = Database['public']['Tables']['restaurants']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type MenuItem = Database['public']['Tables']['menu_items']['Row'];
export type MenuCategory = Database['public']['Tables']['menu_categories']['Row'];
export type GalleryImage = Database['public']['Tables']['restaurant_gallery']['Row'];

// Define o tipo para o horário de funcionamento
export type DaySchedule = {
  open: string; // e.g., "08:00"
  close: string; // e.g., "18:00"
  is_closed: boolean;
};

export type WeekSchedule = {
  monday: DaySchedule[];
  tuesday: DaySchedule[];
  wednesday: DaySchedule[];
  thursday: DaySchedule[];
  friday: DaySchedule[];
  saturday: DaySchedule[];
  sunday: DaySchedule[];
};

// Tipo de dados públicos do restaurante, incluindo dados calculados/relacionados
export type PublicRestaurantData = Omit<Restaurant, 'user_id' | 'cnpj' | 'email' | 'phone' | 'opening_hours'> & {
  is_favorite: boolean;
  followers_count: number;
  addressSummary: string;
  logoUrl: string;
  coverImageUrl: string;
  whatsappUrl: string;
  ifoodUrl: string;
  otherUrl: string;
  opening_hours: WeekSchedule | null; // Usamos o tipo WeekSchedule aqui
};