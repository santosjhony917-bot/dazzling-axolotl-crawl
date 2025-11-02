"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, Share2, MapPin, Utensils, Star, Clock, Phone, Mail, Globe, Instagram, Facebook, Link as LinkIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { RestaurantInfo } from '@/components/public/RestaurantInfo';
import { MenuCategoryList } from '@/components/public/MenuCategoryList';
import { createPageUrl } from '@/utils/url';

interface PublicRestaurantData {
  id: string;
  user_id: string;
  name: string;
  description: string;
  image_url: string;
  cover_image_url: string;
  plan: 'free' | 'basic' | 'premium' | 'premium_gift';
  phone: string;
  email: string;
  whatsapp_url: string;
  ifood_url: string;
  other_url: string;
  address: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
  latitude: number;
  longitude: number;
  opening_hours: any;
  external_url: string;
  payment_methods: string[];
  social_networks: { platform: string; url: string }[];
}

const fetchRestaurantData = async (restaurantId: string): Promise<PublicRestaurantData> => {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', restaurantId)
    .single();

  if (error) throw new Error(error.message);
  return data;
};

const FreeProfileLayout: React.FC = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: restaurant, isLoading, error } = useQuery<PublicRestaurantData, Error>(
    ['restaurant', restaurantId],
    () => fetchRestaurantData(restaurantId!),
    {
      enabled: !!restaurantId,
    }
  );

  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [shareLink, setShareLink] = useState('');

  useEffect(() => {
    if (restaurantId) {
      setShareLink(window.location.origin + createPageUrl('restaurantProfile', { restaurantId }));
    }
  }, [restaurantId]);

  const handleShareClick = () => {
    setIsShareDialogOpen(true);
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
    toast({
      title: "Link Copiado!",
      description: "O link do perfil do restaurante foi copiado para a área de transferência.",
    });
    setIsShareDialogOpen(false);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Skeleton className="w-full h-64 rounded-xl mb-4" />
        <div className="flex items-center space-x-4 mb-6">
          <Skeleton className="w-24 h-24 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        </div>
        <Skeleton className="h-48 w-full rounded-xl mb-4" />
        <Skeleton className="h-48 w-full rounded-xl mb-4" />
        <Skeleton className="h-48 w-full rounded-xl mb-4" />
      </div>
    );
  }

  if (error) {
    return <div className="container mx-auto p-4 max-w-4xl text-red-500">Erro ao carregar restaurante: {error.message}</div>;
  }

  if (!restaurant) {
    return <div className="container mx-auto p-4 max-w-4xl text-gray-700">Restaurante não encontrado.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cover Image */}
      <div className="relative w-full h-64 bg-gray-200 overflow-hidden">
        {restaurant.cover_image_url ? (
          <img src={restaurant.cover_image_url} alt={`${restaurant.name} cover`} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-orange-400 to-red-500 flex items-center justify-center">
            <h1 className="text-white text-4xl font-bold">{restaurant.name}</h1>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
      </div>

      <div className="container mx-auto p-4 max-w-4xl -mt-20 relative z-10">
        {/* Restaurant Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
          <Avatar className="w-28 h-28 border-4 border-white shadow-md">
            <AvatarImage src={restaurant.image_url} alt={restaurant.name} />
            <AvatarFallback className="bg-primary text-white text-3xl font-bold">{restaurant.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-4xl font-extrabold text-gray-900 mb-1">{restaurant.name}</h1>
            <p className="text-gray-600 text-lg">{restaurant.description}</p>
            <div className="flex items-center justify-center md:justify-start text-yellow-500 mt-2">
              <Star className="w-5 h-5 fill-current" />
              <Star className="w-5 h-5 fill-current" />
              <Star className="w-5 h-5 fill-current" />
              <Star className="w-5 h-5 fill-current" />
              <Star className="w-5 h-5 text-gray-300" />
              <span className="ml-2 text-gray-700 text-sm">(4.0)</span>
            </div>
          </div>
          <div className="flex space-x-3 mt-4 md:mt-0">
            <Button variant="outline" size="icon" className="rounded-full shadow-md">
              <Heart className="w-5 h-5" />
            </Button>
            <Button variant="outline" size="icon" className="rounded-full shadow-md" onClick={handleShareClick}>
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Restaurant Info Section */}
            <RestaurantInfo 
              restaurant={restaurant}
            />

            {/* Menu Section */}
            <MenuCategoryList restaurantId={restaurant.id} />
          </div>

          {/* Sidebar / Sticky Content */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">Ações Rápidas</h2>
              <Separator />
              {restaurant.phone && (
                <Button className="w-full justify-start" variant="ghost" onClick={() => window.open(`tel:${restaurant.phone}`)}>
                  <Phone className="mr-2 h-5 w-5" /> Ligar
                </Button>
              )}
              {restaurant.whatsapp_url && (
                <Button className="w-full justify-start" variant="ghost" onClick={() => window.open(restaurant.whatsapp_url, '_blank')}>
                  <LinkIcon className="mr-2 h-5 w-5" /> WhatsApp
                </Button>
              )}
              {restaurant.ifood_url && (
                <Button className="w-full justify-start" variant="ghost" onClick={() => window.open(restaurant.ifood_url, '_blank')}>
                  <LinkIcon className="mr-2 h-5 w-5" /> iFood
                </Button>
              )}
              {restaurant.address && restaurant.latitude && restaurant.longitude && (
                <Button className="w-full justify-start" variant="ghost" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${restaurant.latitude},${restaurant.longitude}`, '_blank')}>
                  <MapPin className="mr-2 h-5 w-5" /> Como Chegar
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Share Dialog */}
      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compartilhar Perfil</DialogTitle>
            <DialogDescription>
              Copie o link abaixo para compartilhar o perfil de {restaurant.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2">
            <Label htmlFor="share-link" className="sr-only">
              Link
            </Label>
            <Input id="share-link" defaultValue={shareLink} readOnly />
            <Button type="submit" onClick={copyShareLink}>
              Copiar
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsShareDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FreeProfileLayout;