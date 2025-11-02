"use client";

import React from 'react';
import { PublicRestaurantData } from '@/types/restaurant';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Heart, Share2, MapPin, Phone, Clock, ExternalLink, Instagram, Facebook, Globe, Whatsapp, UtensilsCrossed, Star, Image as ImageIcon, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card'; // Removido CardContent, pois não é usado diretamente
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton'; // Importado Skeleton
import { ScrollArea } from '@/components/ui/scroll-area'; // Mantido, embora não usado diretamente neste layout
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'; // Mantido, embora não usado diretamente neste layout
import { AspectRatio } from '@/components/ui/aspect-ratio';

interface PremiumProfileLayoutProps {
  restaurant: PublicRestaurantData;
  toggleFavorite: () => void;
  isFavoriteMutating: boolean;
}

const PremiumProfileLayout: React.FC<PremiumProfileLayoutProps> = ({ restaurant, toggleFavorite, isFavoriteMutating }) => {
  const navigate = useNavigate();
  const handleBack = () => navigate(-1);

  const renderSocialIcon = (platform: string, url: string) => {
    let Icon;
    switch (platform) {
      case 'instagram': Icon = Instagram; break;
      case 'facebook': Icon = Facebook; break;
      case 'whatsapp': Icon = Whatsapp; break;
      default: Icon = Globe; break;
    }
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-white hover:text-gray-200 transition-colors">
        <Icon className="w-5 h-5" />
      </a>
    );
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-primary to-highlight text-white">
      {/* Fixed Back Button */}
      <div className="fixed top-4 left-4 z-50">
        <Button variant="ghost" size="icon" onClick={handleBack} className="bg-white/80 backdrop-blur-sm shadow-soft-md hover:bg-white">
          <ArrowLeft className="h-5 w-5 text-primary" />
        </Button>
      </div>

      {/* Cover Image */}
      <div className="relative h-64 w-full bg-gray-800 overflow-hidden">
        {restaurant.cover_image_url ? (
          <img src={restaurant.cover_image_url} alt={`${restaurant.name} cover`} className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-700 to-gray-900 text-gray-500">
            <UtensilsCrossed className="w-16 h-16" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-transparent to-transparent" />
      </div>

      <div className="relative -mt-20 px-4 pb-8 z-10">
        {/* Restaurant Info Card */}
        <Card className="bg-white rounded-xl shadow-lg p-6 border-none text-gray-800">
          <div className="flex items-center justify-between mb-4">
            <Avatar className="w-24 h-24 border-4 border-white shadow-md">
              <AvatarImage src={restaurant.image_url || undefined} alt={restaurant.name} />
              <AvatarFallback className="bg-primary text-white text-2xl font-semibold">{restaurant.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="icon"
                onClick={toggleFavorite}
                disabled={isFavoriteMutating}
                className={cn(
                  "rounded-full shadow-sm",
                  restaurant.is_favorite ? "bg-red-50 text-red-500 border-red-200 hover:bg-red-100" : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                )}
              >
                <Heart className={cn("w-5 h-5", restaurant.is_favorite && "fill-red-500")} />
              </Button>
              <Button variant="outline" size="icon" className="rounded-full shadow-sm bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100">
                <Share2 className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-primary mb-1">{restaurant.name}</h1>
          <div className="flex items-center text-sm text-gray-600 mb-3">
            <Badge variant="secondary" className="bg-primary text-white mr-2">{restaurant.category || 'Geral'}</Badge>
            <span className="flex items-center">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 mr-1" />
              {restaurant.average_rating ? restaurant.average_rating.toFixed(1) : 'N/A'}
            </span>
          </div>

          {restaurant.description && (
            <p className="text-base text-gray-700 mb-4">{restaurant.description}</p>
          )}

          <Separator className="my-4" />

          <div className="space-y-3 text-base text-gray-700">
            {restaurant.address && restaurant.number && restaurant.neighborhood && restaurant.city && restaurant.state && (
              <div className="flex items-start">
                <MapPin className="w-5 h-5 mr-2 mt-1 text-primary shrink-0" />
                <span>{restaurant.address}, {restaurant.number} - {restaurant.neighborhood}, {restaurant.city} - {restaurant.state}</span>
              </div>
            )}
            {restaurant.phone && (
              <a href={`tel:${restaurant.phone}`} className="flex items-center hover:text-primary transition-colors">
                <Phone className="w-5 h-5 mr-2 text-primary shrink-0" />
                <span>{restaurant.phone}</span>
              </a>
            )}
            {restaurant.opening_hours && (
              <div className="flex items-start">
                <Clock className="w-5 h-5 mr-2 mt-1 text-primary shrink-0" />
                <span>Horário de funcionamento: <span className="font-medium">Ver detalhes</span></span>
              </div>
            )}
          </div>

          {/* External Links */}
          {(restaurant.whatsapp_url || restaurant.ifood_url || restaurant.other_url) && (
            <>
              <Separator className="my-4" />
              <div className="flex flex-wrap gap-3">
                {restaurant.whatsapp_url && (
                  <Button variant="outline" className="flex items-center gap-2 text-green-600 border-green-200 hover:bg-green-50" asChild>
                    <a href={restaurant.whatsapp_url} target="_blank" rel="noopener noreferrer">
                      <Whatsapp className="w-4 h-4" /> WhatsApp
                    </a>
                  </Button>
                )}
                {restaurant.ifood_url && (
                  <Button variant="outline" className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50" asChild>
                    <a href={restaurant.ifood_url} target="_blank" rel="noopener noreferrer">
                      <UtensilsCrossed className="w-4 h-4" /> iFood
                    </a>
                  </Button>
                )}
                {restaurant.other_url && (
                  <Button variant="outline" className="flex items-center gap-2 text-blue-600 border-blue-200 hover:bg-blue-50" asChild>
                    <a href={restaurant.other_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" /> Website
                    </a>
                  </Button>
                )}
              </div>
            </>
          )}
        </Card>

        {/* Gallery Section (Mock for now) */}
        <Card className="mt-6 bg-white rounded-xl shadow-lg p-6 border-none text-gray-800">
          <h2 className="text-xl font-bold text-primary mb-4 flex items-center">
            <ImageIcon className="w-5 h-5 mr-2" /> Galeria de Fotos
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {/* Placeholder images */}
            <AspectRatio ratio={1 / 1}>
              <Skeleton className="w-full h-full rounded-md bg-gray-200" />
            </AspectRatio>
            <AspectRatio ratio={1 / 1}>
              <Skeleton className="w-full h-full rounded-md bg-gray-200" />
            </AspectRatio>
            <AspectRatio ratio={1 / 1}>
              <Skeleton className="w-full h-full rounded-md bg-gray-200" />
            </AspectRatio>
            <AspectRatio ratio={1 / 1}>
              <Skeleton className="w-full h-full rounded-md bg-gray-200" />
            </AspectRatio>
          </div>
          <p className="text-sm text-gray-500 mt-4 text-center">
            (Funcionalidade de galeria real em breve!)
          </p>
        </Card>

        {/* Menu Section (Mock for now) */}
        <Card className="mt-6 bg-white rounded-xl shadow-lg p-6 border-none text-gray-800">
          <h2 className="text-xl font-bold text-primary mb-4 flex items-center">
            <Menu className="w-5 h-5 mr-2" /> Cardápio
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-3/5 bg-gray-200" />
              <Skeleton className="h-6 w-1/5 bg-gray-200" />
            </div>
            <Skeleton className="h-4 w-4/5 bg-gray-200" />
            <Separator />
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-2/5 bg-gray-200" />
              <Skeleton className="h-6 w-1/5 bg-gray-200" />
            </div>
            <Skeleton className="h-4 w-3/5 bg-gray-200" />
          </div>
          <p className="text-sm text-gray-500 mt-4 text-center">
            (Funcionalidade de cardápio real em breve!)
          </p>
        </Card>
      </div>
    </div>
  );
};

export default PremiumProfileLayout;