"use client";

import { PublicRestaurantData } from "@/types/restaurant";
import { cn } from '@/lib/utils';
import { OrderChannelsSection } from './OrderChannelsSection';
import RestaurantInfo from './RestaurantInfo';
import GallerySection from './GallerySection';
import MenuSection from './MenuSection';
import Footer from './Footer';
import { Separator } from '../ui/separator';
import { MapPin, Phone } from 'lucide-react';
import { Button } from '../ui/button';
import { useRestaurantHours } from '@/hooks/useRestaurantHours';
import { Badge } from '../ui/badge';
import { formatPhoneNumber } from '@/utils/formatters';

interface FreeProfileLayoutProps {
  restaurant: PublicRestaurantData;
  toggleFavorite: () => void;
  isFavoriteMutating: boolean;
}

export default function FreeProfileLayout({ restaurant, toggleFavorite, isFavoriteMutating }: FreeProfileLayoutProps) {
  const { isOpen, statusText } = useRestaurantHours(restaurant.opening_hours);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header/Cover Image */}
      <div className="relative h-48 md:h-64 bg-gray-200 overflow-hidden">
        {restaurant.coverImageUrl ? (
          <img
            src={restaurant.coverImageUrl}
            alt={`Capa de ${restaurant.name}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-600">
            Imagem de Capa
          </div>
        )}
      </div>

      <main className="container mx-auto px-4 -mt-16 pb-8">
        {/* Restaurant Card */}
        <div className="bg-white shadow-lg rounded-xl p-4 md:p-6 mb-6">
          <div className="flex items-start space-x-4">
            {/* Logo */}
            <div className="flex-shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-white bg-gray-100 overflow-hidden shadow-md">
              {restaurant.logoUrl ? (
                <img
                  src={restaurant.logoUrl}
                  alt={`Logo de ${restaurant.name}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                  Logo
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-grow pt-2">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
                {restaurant.name}
              </h1>
              <p className="text-sm text-gray-600 mb-2">{restaurant.category}</p>
              <Badge
                className={cn(
                  "text-xs font-medium",
                  isOpen ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"
                )}
              >
                {statusText}
              </Badge>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Contact and Location */}
          <div className="space-y-3 text-sm text-gray-700">
            {restaurant.addressSummary && (
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-2 text-gray-500 flex-shrink-0" />
                <p>{restaurant.addressSummary}</p>
              </div>
            )}

            {restaurant.whatsappUrl && (
              <div className="flex items-center">
                <Phone className="w-4 h-4 mr-2 text-gray-500 flex-shrink-0" />
                <Button variant="link" className="h-auto p-0 text-sm font-normal text-gray-700 hover:text-gray-900">
                  <a href={restaurant.whatsappUrl} target="_blank" rel="noopener noreferrer">
                    {formatPhoneNumber(restaurant.whatsappUrl.split('?')[0].split('/').pop() || '')}
                  </a>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          <OrderChannelsSection restaurant={restaurant} />
          <RestaurantInfo restaurant={restaurant} />
          <GallerySection restaurantId={restaurant.id} />
          <MenuSection restaurantId={restaurant.id} />
        </div>
      </main>

      <Footer restaurant={restaurant} />
    </div>
  );
}