import { PublicRestaurantData } from './restaurant';

// Define os campos que podem ser atualizados via formulário de configurações
export type UpdateRestaurantPayload = Partial<Omit<PublicRestaurantData, 
  'id' | 'user_id' | 'plan' | 'created_at' | 'followers_override' | 'logoUrl' | 'addressSummary' | 'followers_count' | 'menu_categories' | 'gallery_images'
>>;