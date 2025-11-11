"use client";

import React, { useMemo, useState } from 'react';
import { PublicRestaurantData, GalleryImage } from '@/types/restaurant';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Utensils, MapPin, Clock, Heart, Share2, Phone, Mail, Image, Info } from 'lucide-react';
import RestaurantMenu from './RestaurantMenu';
import RestaurantGallery from './RestaurantGallery';
import { Button } from '@/components/ui/button';
import { useAuthData } from '@/context/AuthContext';
import { getRestaurantOpenStatus } from '@/lib/schedule';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import OrderChannelsSection from './OrderChannelsSection';
import DetailedHoursDisplay from './DetailedHoursDisplay';
import RestaurantActionsBar from './RestaurantActionsBar';
import RestaurantProfileHeader from './RestaurantProfileHeader';
import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import RestaurantAddressHoursSection from './RestaurantAddressHoursSection';
import RestaurantInfo from './RestaurantInfo';
import RestaurantMainInfoCard from './RestaurantMainInfoCard';
import AdditionalInfo from './AdditionalInfo';
import { PublicMenuItem } from '@/types/menu';

interface PremiumProfileLayoutProps {
  restaurant: PublicRestaurantData;
  toggleFavorite: () => void;
  isFavoriteMutating: boolean;
  isCompact?: boolean;
}

const PremiumProfileLayout: React.FC<PremiumProfileLayoutProps> = ({ restaurant, toggleFavorite, isFavoriteMutating, isCompact = false }) => {
  console.log("PremiumProfileLayout: Renderizando com restaurante:", restaurant.name); // Adicionado para depuração
  
  return (
    <div className="relative min-h-screen bg-yellow-100 p-4">
      <h1 className="text-2xl font-bold text-red-500">Conteúdo de Teste do PremiumProfileLayout</h1>
      <p className="text-gray-700">Se você está vendo isso, o componente está renderizando!</p>
    </div>
  );
};

export default PremiumProfileLayout;