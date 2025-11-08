"use client";

import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Phone, Globe, Star, Heart, Share2, Utensils, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import RestaurantMenu from "./RestaurantMenu";
import RestaurantGallery from "./RestaurantGallery";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PublicRestaurantData } from "@/types/restaurant";
import DetailedHoursDisplay from "./DetailedHoursDisplay";

// Helper to determine container padding based on screen size
const containerPxClass = "px-4 sm:px-6 lg:px-8";

interface PremiumProfileLayoutProps {
  restaurant: PublicRestaurantData;
  toggleFavorite: () => void;
  isFavoriteMutating: boolean;
  isCompact: boolean;
}

const PremiumProfileLayout: React.FC<PremiumProfileLayoutProps> = ({ restaurant, toggleFavorite, isFavoriteMutating }) => {
  if (!restaurant) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center">
        <p className="text-red-500">Erro ao carregar os dados do restaurante.</p>
      </div>
    );
  }

  const hasSocials =
    restaurant.whatsapp_url || restaurant.ifood_url || restaurant.other_url;
  const hasContactInfo = restaurant.phone || restaurant.email;
  const hasAddress =
    restaurant.address ||
    restaurant.number ||
    restaurant.neighborhood ||
    restaurant.city ||
    restaurant.state ||
    restaurant.cep;

  const formattedMenu = restaurant.menu_categories?.map(category => ({
    ...category,
    items: category.menu_items || [],
  })) || [];

  const galleryImages = (restaurant as any).restaurant_gallery || restaurant.gallery_images || [];

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: restaurant.name,
        text: `Confira o cardápio do ${restaurant.name}!`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      // Fallback for browsers that don't support navigator.share
      navigator.clipboard.writeText(window.location.href);
      alert("Link copiado para a área de transferência!");
    }
  };

  return (
    <div className="relative min-h-screen bg-background-light pb-20">
      {/* Cover Image and Header Actions */}
      <div className="relative h-48 md:h-64 w-full bg-gray-200">
        {restaurant.cover_image_url ? (
          <img
            src={restaurant.cover_image_url}
            alt={`${restaurant.name} cover`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-r from-gray-400 to-gray-500"></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>

        {/* Header actions */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10">
          <Button asChild variant="ghost" className="bg-black/30 hover:bg-black/50 text-white rounded-full p-0 h-10 w-10">
            <Link to="/">
              <ChevronLeft className="h-6 w-6" />
            </Link>
          </Button>
          <div className="flex space-x-2">
            <Button variant="ghost" size="icon" className="bg-black/30 hover:bg-black/50 text-white rounded-full h-10 w-10" onClick={toggleFavorite} disabled={isFavoriteMutating}>
              <Heart className={cn("h-5 w-5 transition-colors", restaurant.is_favorite ? "fill-red-500 text-red-500" : "text-white")} />
            </Button>
            <Button variant="ghost" size="icon" className="bg-black/30 hover:bg-black/50 text-white rounded-full h-10 w-10" onClick={handleShare}>
              <Share2 className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Restaurant name on cover */}
        <div className="absolute bottom-4 left-4 right-4 text-white z-10">
           <h1 className="text-4xl md:text-5xl font-extrabold tracking-wider uppercase shadow-xl">{restaurant.name}</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className={cn("relative -mt-16 mb-4", containerPxClass)}>
        <Avatar className="h-32 w-32 rounded-full border-4 border-white shadow-md">
          <AvatarImage src={restaurant.image_url || "/placeholder.svg"} alt={`${restaurant.name} logo`} />
          <AvatarFallback className="text-3xl">{restaurant.name?.charAt(0)}</AvatarFallback>
        </Avatar>
      </div>

      <div className={cn("space-y-6 pb-8", containerPxClass)}>
        <div>
            <h2 className="text-3xl font-bold text-gray-900 -mt-2">
                {restaurant.name}
            </h2>
            {restaurant.category && (
                <Badge variant="secondary" className="mt-2 text-base py-1 px-3">
                <Utensils className="h-4 w-4 mr-2" /> {restaurant.category}
                </Badge>
            )}
            <div className="flex items-center mt-2 text-gray-600">
                <Star className="h-5 w-5 text-yellow-500 mr-1" fill="currentColor" />
                <span className="font-semibold">4.5</span>
                <span className="ml-1">(120 avaliações)</span>
            </div>
        </div>

        <div className="space-y-6">
          {restaurant.description && (
            <Card className="shadow-soft-sm border-none">
              <CardContent className="p-4">
                <p className="text-gray-700 leading-relaxed">{restaurant.description}</p>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-soft-md border-none bg-highlight text-white">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold">
                  Faça seu Pedido
                </CardTitle>
                <p className="text-sm opacity-90">
                  Peça agora e receba no conforto da sua casa!
                </p>
              </div>
              <Button asChild className="bg-white text-highlight hover:bg-gray-100 font-bold">
                <Link to={`/restaurants/${restaurant.id}/order`}>Pedir</Link>
              </Button>
            </CardContent>
          </Card>

          {formattedMenu.length > 0 && (
            <RestaurantMenu
              restaurantId={restaurant.id}
              menu={formattedMenu}
            />
          )}

          {galleryImages.length > 0 && (
            <RestaurantGallery images={galleryImages} />
          )}

          {(hasContactInfo || hasAddress || restaurant.opening_hours) && (
            <Card className="shadow-soft-sm border-none">
                <CardContent className="p-4 space-y-4 divide-y">
                    {hasContactInfo && (
                        <div className="space-y-2 pt-2 first:pt-0">
                            <h3 className="font-bold text-lg">Contato</h3>
                            {restaurant.phone && (
                            <div className="flex items-center text-gray-700">
                                <Phone className="h-5 w-5 mr-3 text-primary" />
                                <span>{restaurant.phone}</span>
                            </div>
                            )}
                            {restaurant.email && (
                            <div className="flex items-center text-gray-700">
                                <Globe className="h-5 w-5 mr-3 text-primary" />
                                <span>{restaurant.email}</span>
                            </div>
                            )}
                        </div>
                    )}
                    {hasAddress && (
                        <div className="space-y-2 pt-4 first:pt-0">
                            <h3 className="font-bold text-lg">Endereço</h3>
                            <div className="flex items-start text-gray-700">
                                <MapPin className="h-5 w-5 mr-3 text-primary flex-shrink-0 mt-1" />
                                <div>
                                    <p>{restaurant.address}, {restaurant.number} - {restaurant.neighborhood}</p>
                                    <p>{restaurant.city}, {restaurant.state} - {restaurant.cep}</p>
                                </div>
                            </div>
                            {restaurant.latitude && restaurant.longitude && (
                                <Button variant="outline" className="w-full mt-4">Ver no Mapa</Button>
                            )}
                        </div>
                    )}
                    {restaurant.opening_hours && (
                        <div className="space-y-2 pt-4 first:pt-0">
                            <h3 className="font-bold text-lg">Horário de Funcionamento</h3>
                            <DetailedHoursDisplay schedule={restaurant.opening_hours} />
                        </div>
                    )}
                </CardContent>
            </Card>
          )}

          {hasSocials && (
            <Card className="shadow-soft-sm border-none">
              <CardHeader>
                <CardTitle className="text-lg">Redes Sociais e Links</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {restaurant.whatsapp_url && (
                  <Button asChild variant="outline">
                    <a href={restaurant.whatsapp_url} target="_blank" rel="noopener noreferrer">
                      <Phone className="h-4 w-4 mr-2" /> WhatsApp
                    </a>
                  </Button>
                )}
                {restaurant.ifood_url && (
                  <Button asChild variant="outline">
                    <a href={restaurant.ifood_url} target="_blank" rel="noopener noreferrer">
                      <Utensils className="h-4 w-4 mr-2" /> iFood
                    </a>
                  </Button>
                )}
                {restaurant.other_url && (
                  <Button asChild variant="outline">
                    <a href={restaurant.other_url} target="_blank" rel="noopener noreferrer">
                      <Globe className="h-4 w-4 mr-2" /> {restaurant.other_url_label || 'Website'}
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default PremiumProfileLayout;