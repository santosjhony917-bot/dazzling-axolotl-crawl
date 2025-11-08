"use client";

import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Phone, Globe, Instagram, Facebook, Twitter, Clock, Utensils, Star, Heart, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import RestaurantMenu from "./RestaurantMenu";
import RestaurantGallery from "./RestaurantGallery";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

// Helper to determine container padding based on screen size
const containerPxClass = "px-4 sm:px-6 lg:px-8";

interface PublicRestaurantData {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  cover_image_url?: string;
  category?: string;
  phone?: string;
  email?: string;
  address?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
  latitude?: number;
  longitude?: number;
  opening_hours?: Record<string, string>;
  whatsapp_url?: string;
  ifood_url?: string;
  other_url?: string;
  menu_categories?: Array<{
    id: string;
    name: string;
    menu_items: Array<{
      id: string;
      name: string;
      description?: string;
      price: number;
      image_url?: string;
    }>;
  }>;
  restaurant_gallery?: Array<{
    id: string;
    image_url: string;
    caption?: string;
    order_index?: number;
  }>;
}

interface PremiumProfileLayoutProps {
  restaurant: PublicRestaurantData;
  toggleFavorite: () => void;
  isFavoriteMutating: boolean;
  isCompact: boolean;
}

const RestaurantPageHeader = () => {
  const { id } = useParams<{ id: string }>();
  const { data: restaurant, isLoading, error } = useQuery({
    queryKey: ["restaurant", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="fixed top-0 left-0 right-0 bg-white shadow-sm z-10 p-4 flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <div className="flex space-x-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="fixed top-0 left-0 right-0 bg-white shadow-sm z-10 p-4 text-center text-red-500">
        Erro ao carregar restaurante.
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-0 right-0 bg-white shadow-sm z-10 p-4 flex items-center justify-between">
      <Link to="/" className="text-lg font-bold text-primary">
        &lt; Voltar
      </Link>
      <h1 className="text-xl font-semibold">{restaurant.name}</h1>
      <div className="flex space-x-2">
        <Button variant="ghost" size="icon">
          <Heart className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon">
          <Share2 className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

const PremiumProfileLayout: React.FC<PremiumProfileLayoutProps> = ({ restaurant, toggleFavorite, isFavoriteMutating, isCompact }) => {
  // The useQuery hook is already defined in the parent component (RestaurantProfilePublic or Upgrade)
  // and passes the 'restaurant' prop down. So, we don't need to fetch it again here.

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-background-light pt-[96px] flex items-center justify-center">
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

  return (
    <div className="relative min-h-screen bg-background-light">
      {/* Novo cabeçalho fixo no topo */}
      <RestaurantPageHeader />

      {/* Cover Image */}
      <div className="relative h-48 w-full bg-gray-200">
        {restaurant.cover_image_url && (
          <img
            src={restaurant.cover_image_url}
            alt={`${restaurant.name} cover`}
            className="h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
      </div>

      {/* Restaurant Logo and Basic Info */}
      <div className={cn("relative -mt-16 mb-4", containerPxClass)}>
        <Avatar className="h-32 w-32 rounded-full border-4 border-white shadow-md">
          <AvatarImage src={restaurant.image_url || "/placeholder.svg"} />
          <AvatarFallback>{restaurant.name?.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="mt-4">
          <h1 className="text-3xl font-bold text-gray-900">
            {restaurant.name}
          </h1>
          {restaurant.category && (
            <Badge variant="secondary" className="mt-2">
              <Utensils className="h-4 w-4 mr-1" /> {restaurant.category}
            </Badge>
          )}
          <div className="flex items-center mt-2 text-gray-600">
            <Star className="h-4 w-4 text-yellow-500 mr-1" fill="currentColor" />
            <span>4.5 (120 avaliações)</span> {/* Placeholder for ratings */}
          </div>
        </div>
      </div>

      <div className={cn("pb-8 pt-16", containerPxClass)}>
        {/* Conteúdo Principal */}
        <div className="space-y-6">
          {/* Description */}
          {restaurant.description && (
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <p className="text-gray-700">{restaurant.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Make an Order Card */}
          <Card className="shadow-sm bg-orange-500 text-white">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold">
                  Faça seu Pedido
                </CardTitle>
                <p className="text-sm">
                  Peça agora e receba no conforto da sua casa!
                </p>
              </div>
              <Button asChild className="bg-white text-orange-500 hover:bg-gray-100">
                <Link to={`/restaurants/${restaurant.id}/order`}>Pedir</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Menu Section */}
          {restaurant.menu_categories && restaurant.menu_categories.length > 0 && (
            <RestaurantMenu
              restaurantId={restaurant.id}
              menu={restaurant.menu_categories}
            />
          )}

          {/* Gallery Section */}
          {restaurant.restaurant_gallery && restaurant.restaurant_gallery.length > 0 && (
            <RestaurantGallery images={restaurant.restaurant_gallery} />
          )}

          {/* Contact Info */}
          {hasContactInfo && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Contato</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {restaurant.phone && (
                  <div className="flex items-center text-gray-700">
                    <Phone className="h-5 w-5 mr-2 text-primary" />
                    <span>{restaurant.phone}</span>
                  </div>
                )}
                {restaurant.email && (
                  <div className="flex items-center text-gray-700">
                    <Globe className="h-5 w-5 mr-2 text-primary" />
                    <span>{restaurant.email}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Address */}
          {hasAddress && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Endereço</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-start text-gray-700">
                  <MapPin className="h-5 w-5 mr-2 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <p>
                      {restaurant.address}, {restaurant.number} -{" "}
                      {restaurant.neighborhood}
                    </p>
                    <p>
                      {restaurant.city}, {restaurant.state} - {restaurant.cep}
                    </p>
                  </div>
                </div>
                {restaurant.latitude && restaurant.longitude && (
                  <Button variant="outline" className="w-full mt-4">
                    Ver no Mapa
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Opening Hours */}
          {restaurant.opening_hours && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Horário de Funcionamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(restaurant.opening_hours).map(([day, hours]) => (
                  <div key={day} className="flex justify-between text-gray-700">
                    <span className="font-medium">{day}</span>
                    <span>{hours as string}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Social Networks */}
          {hasSocials && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Redes Sociais</CardTitle>
              </CardHeader>
              <CardContent className="flex space-x-4">
                {restaurant.whatsapp_url && (
                  <a
                    href={restaurant.whatsapp_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="icon">
                      <Phone className="h-5 w-5" />
                    </Button>
                  </a>
                )}
                {restaurant.ifood_url && (
                  <a
                    href={restaurant.ifood_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="icon">
                      <Utensils className="h-5 w-5" />
                    </Button>
                  </a>
                )}
                {restaurant.other_url && (
                  <a
                    href={restaurant.other_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="icon">
                      <Globe className="h-5 w-5" />
                    </Button>
                  </a>
                )}
                {/* Add more social icons as needed */}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default PremiumProfileLayout;