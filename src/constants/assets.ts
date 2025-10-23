// URLs baseadas na estrutura do nosso Supabase Storage
const SUPABASE_STORAGE_BASE_URL = 'https://ystffcohclbtykangfnt.supabase.co/storage/v1/object/public/restaurant_images';

// URL para o logo padrão do restaurante, agora vindo do Storage
export const DEFAULT_RESTAURANT_LOGO_URL = `${SUPABASE_STORAGE_BASE_URL}/app-assets/default-logo.png`;

// URL para uma imagem placeholder genérica, agora vindo do Storage
export const PLACEHOLDER_IMAGE_URL = `${SUPABASE_STORAGE_BASE_URL}/app-assets/placeholder.png`;

// URLs para as imagens do onboarding
export const ONBOARDING_IMAGE_1 = `${SUPABASE_STORAGE_BASE_URL}/app-assets/onboarding/onboarding-1.jpg`;
export const ONBOARDING_IMAGE_2 = `${SUPABASE_STORAGE_BASE_URL}/app-assets/onboarding/onboarding-2.jpg`;
export const ONBOARDING_IMAGE_3 = `${SUPABASE_STORAGE_BASE_URL}/app-assets/onboarding/onboarding-3.jpg`;