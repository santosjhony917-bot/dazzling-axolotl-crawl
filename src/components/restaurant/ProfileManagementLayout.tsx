import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant } from '@/types/supabase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Utensils, Link, MapPin, Clock, Image, User, Loader2 } from 'lucide-react';
import { InfoCardItem } from './InfoCardItem';
import { RestaurantLinksForm } from './RestaurantLinksForm';
// Assuming other forms like RestaurantProfileForm, RestaurantLocationForm, etc., exist and are imported

// Define the type for the restaurant plan (assuming it's defined elsewhere, but defining locally for safety)
type RestaurantPlan = 'free' | 'premium' | 'premium_gift';

const fetchRestaurantProfile = async (restaurantId: string): Promise<Restaurant> => {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', restaurantId)
    .single();

  if (error) throw new Error(error.message);
  return data as Restaurant;
};

export default function ProfileManagementLayout() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const [activeTab, setActiveTab] = useState('profile');

  const { data: restaurant, isLoading, error } = useQuery<Restaurant, Error>({
    queryKey: ['restaurantProfile', restaurantId],
    queryFn: () => fetchRestaurantProfile(restaurantId!),
    enabled: !!restaurantId,
  });

  if (isLoading) return <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>;
  if (error) return <div className="text-center py-10 text-red-500">Erro ao carregar perfil: {error.message}</div>;
  if (!restaurant) return <div className="text-center py-10">Restaurante não encontrado.</div>;

  const isPremium = restaurant.plan === 'premium' || restaurant.plan === 'premium_gift';
  
  // All external links are restricted for free plan
  const areExternalLinksLocked = !isPremium;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-primary mb-6">{restaurant.name} - Gerenciamento</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-5 h-auto">
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" /> Perfil
          </TabsTrigger>
          <TabsTrigger value="links">
            <Link className="h-4 w-4 mr-2" /> Links
          </TabsTrigger>
          <TabsTrigger value="location">
            <MapPin className="h-4 w-4 mr-2" /> Localização
          </TabsTrigger>
          <TabsTrigger value="hours">
            <Clock className="h-4 w-4 mr-2" /> Horários
          </TabsTrigger>
          <TabsTrigger value="gallery">
            <Image className="h-4 w-4 mr-2" /> Galeria
          </TabsTrigger>
        </TabsList>

        {/* PROFILE TAB (Placeholder) */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
              <CardDescription>Atualize o nome, descrição e categoria do seu restaurante.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Assuming RestaurantProfileForm is used here */}
              {/* <RestaurantProfileForm restaurant={restaurant} /> */}
              <p className="text-sm text-gray-500">Formulário de Perfil Básico (Não alterado)</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LINKS TAB */}
        <TabsContent value="links">
          <Card>
            <CardHeader>
              <CardTitle>Links Externos</CardTitle>
              <CardDescription>
                Adicione links para WhatsApp, iFood e outros sites. Disponível apenas para planos Premium.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RestaurantLinksForm restaurant={restaurant} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* LOCATION TAB (Placeholder) */}
        <TabsContent value="location">
          <Card>
            <CardHeader>
              <CardTitle>Localização</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">Formulário de Localização (Não alterado)</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* HOURS TAB (Placeholder) */}
        <TabsContent value="hours">
          <Card>
            <CardHeader>
              <CardTitle>Horários de Funcionamento</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">Formulário de Horários (Não alterado)</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* GALLERY TAB (Placeholder) */}
        <TabsContent value="gallery">
          <Card>
            <CardHeader>
              <CardTitle>Galeria de Imagens</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">Gerenciamento de Galeria (Não alterado)</p>
            </CardContent>
          </Card>
        </TabsContent>


        {/* SUMMARY VIEW - Where the user's snippet was located */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Resumo do Perfil</CardTitle>
          </CardHeader>
          <CardContent>
            <h3 className="text-lg font-semibold mb-2 text-primary">
              Links e Contato
            </h3>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              <InfoCardItem 
                label="Link do WhatsApp" 
                value={restaurant?.whatsapp_url || "Não definido"} 
                isLocked={areExternalLinksLocked}
              />
              <InfoCardItem 
                label="Link do iFood" 
                value={restaurant?.ifood_url || "Não definido"} 
                isLocked={areExternalLinksLocked}
              />
              <InfoCardItem 
                label="Outro Link" 
                value={restaurant?.other_url || "Não definido"} 
                isLocked={areExternalLinksLocked}
              />
            </div>
            {/* ... other summary items */}
          </CardContent>
        </Card>
        
      </Tabs>
    </div>
  );
}