import React from 'react';
import { Restaurant } from '@/types/supabase';
import { MapPin, Phone, Share2, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DEFAULT_RESTAURANT_LOGO_URL } from '@/constants/assets';
import { ImageUploadButton } from '@/components/ImageUploadButton';
import { Camera } from 'lucide-react';
import { DEFAULT_USER_AVATAR_URL } from '@/constants/assets';
import { USER_AVATARS_BUCKET } from '@/integrations/supabase/storage';
import { RESTAURANT_IMAGES_BUCKET } from '@/integrations/supabase/storage';

// ... (restante do arquivo)