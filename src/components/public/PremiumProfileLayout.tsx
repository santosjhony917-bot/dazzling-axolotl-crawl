import React, { useMemo, useState } from 'react';
import { PublicRestaurantData } from '@/types/restaurant';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Utensils, MapPin, Clock, Heart, Share2, Phone, Mail, Image, Info } from 'lucide-react';
import RestaurantMenu from './RestaurantMenu';
import RestaurantGallery from './RestaurantGallery';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { getRestaurantOpenStatus } from '@/lib/schedule';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import OrderChannelsSection from './OrderChannelsSection';
import DetailedHoursDisplay from './DetailedHoursDisplay';
import RestaurantActionsBar from './RestaurantActionsBar'; // CORRIGIDO: Importando o componente renomeado
import RestaurantProfileHeader from './RestaurantProfileHeader'; // NOVO: Componente principal
import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import RestaurantAddressHoursSection from './RestaurantAddressHoursSection'; // NOVO IMPORT
import RestaurantInfo from './RestaurantInfo'; // Componente refatorado para Contato/Links
import RestaurantMainInfoCard from './RestaurantMainInfoCard'; // NOVO IMPORT
import AdditionalInfo from './AdditionalInfo';
import { isRestaurantOpen } from "@/lib/utils";

interface PremiumProfileLayoutProps {
  restaurant: PublicRestaurantData;
  children: React.ReactNode;
  onFavoriteToggle: () => void;
  isFavoriteMutating: boolean;
  isFavorite: boolean;
  isCompact?: boolean; // Adicionado
}

const PremiumProfileLayout: React.FC<PremiumProfileLayoutProps> = ({
  restaurant,
  children,
  onFavoriteToggle,
  isFavoriteMutating,
  isFavorite,
  isCompact,
}) => {
  return (
    <div className="relative min-h-screen bg-gray-50">
      {/* Header do perfil premium com capa e logo */}
      <RestaurantProfileHeader
        restaurant={{
          id: restaurant.id,
          name: restaurant.name,
          coverImageUrl: restaurant.cover_image_url,
          isPremium: true,
        }}
      />

      {/* Conteúdo principal do perfil premium */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 -mt-24">
        <div className="mt-8 space-y-8">
          {children}
        </div>
      </div>
    </div>
  );
};

export default PremiumProfileLayout;