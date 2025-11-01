"use client";

import { PublicRestaurantData } from "@/types/restaurant";
import { cn } from '@/lib/utils';
import { OrderChannelsSection } from './OrderChannelsSection';
import DetailedHoursDisplay from './DetailedHoursDisplay';
import RestaurantInfo from './RestaurantInfo';
import MenuSection from './MenuSection';
import GallerySection from './GallerySection';
import Footer from './Footer';
import { Separator } from '../ui/separator';
import { MapPin, Phone } from 'lucide-react';
import { Button } from '../ui/button';
import { useRestaurantHours } from '@/hooks/useRestaurantHours';
import { Badge } from '../ui/badge';
import { formatPhoneNumber } from '@/utils/formatters';

interface PremiumProfileLayoutProps {
  restaurant: PublicRestaurantData;
  toggleFavorite: () => void;
  isFavoriteMutating: boolean;
}

export default function PremiumProfileLayout({ restaurant, toggleFavorite, isFavoriteMutating }: PremiumProfileLayoutProps) {
  const { isOpen, statusText } = useRestaurantHours(restaurant.opening_hours);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header/Cover Image */}
      <div className="relative h-64 md:h-80 bg-gray-200 overflow-hidden">
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

      <main className="container mx-auto px-4 -mt-20 pb-8">
        {/* Restaurant Card */}
        <div className="bg-white shadow-xl rounded-xl p-5 md:p-8 mb-6 border-t-4 border-red-600">
          <div className="flex flex-col md:flex-row md:items-start md:space-x-6">
            {/* Logo */}
            <div className="flex-shrink-0 w-24 h-24 md:w-32 md:h-32 rounded-full border-6 border-white bg-gray-100 overflow-hidden shadow-lg -mt-10 md:-mt-12 mx-auto md:mx-0">
              {restaurant.logoUrl ? (
                <img
                  src={restaurant.logoUrl}
                  alt={`Logo de ${restaurant.name}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
                  Logo
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-grow pt-4 md:pt-0 text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-1">
                {restaurant.name}
              </h1>
              <p className="text-md text-gray-600 mb-3">{restaurant.category}</p>
              <Badge
                className={cn(
                  "text-sm font-semibold",
                  isOpen ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                )}
              >
                {statusText}
              </Badge>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Contact and Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
            {restaurant.addressSummary && (
              <div className="flex items-start">
                <MapPin className="w-4 h-4 mt-1 mr-2 text-red-600 flex-shrink-0" />
                <p>{restaurant.addressSummary}</p>
              </div>
            )}

            {restaurant.whatsappUrl && (
              <div className="flex items-start">
                <Phone className="w-4 h-4 mt-1 mr-2 text-red-600 flex-shrink-0" />
                <Button variant="link" className="h-auto p-0 text-sm font-normal text-gray-700 hover:text-red-700">
                  <a href={restaurant.whatsappUrl} target="_blank" rel="noopener noreferrer">
                    {formatPhoneNumber(restaurant.whatsappUrl.split('?')[0].split('/').pop() || '')}
                  </a>
                </Button>
              </div>
            )}
          </div>
          
          <DetailedHoursDisplay schedule={restaurant.opening_hours} />
        </div>

        {/* Sections */}
        <div className="space-y-8">
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