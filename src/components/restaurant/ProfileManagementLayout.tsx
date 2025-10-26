import React, { useState } from 'react';
import { useAuthContext } from '@/context/AuthContext'; // Importando useAuthContext
import { Restaurant } from '@/types/supabase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Utensils, Link, MapPin, Clock, Image, User, Loader2, LogOut } from 'lucide-react';
import { InfoCardItem } from './InfoCardItem';
import { RestaurantLinksForm } from './RestaurantLinksForm';
import { Button } from '@/components/ui/button';
import NavCardItem from '../NavCardItem'; // Adicionando NavCardItem para navegação interna
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';

// Define the type for the restaurant plan (assuming it's defined elsewhere, but defining locally for safety)
type RestaurantPlan = 'free' | 'premium' | 'premium_gift';

export default function ProfileManagementLayout() {
  const { restaurant, isLoading: authLoading, isPremium, signOut } = useAuthContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');

  // Usamos o estado de carregamento do AuthContext
  if (authLoading) return <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>;
  
  // O ProtectedRoute já garante que 'restaurant' existe, mas mantemos o check
  if (!restaurant) return <div className="text-center py-10">Restaurante não encontrado.</div>;

  // All external links are restricted for free plan
  const areExternalLinksLocked = !isPremium;

  return (
    <div className="p-4 md:p-8 max-w-md mx-auto">
      <h1 className="text-3xl font-bold text-primary mb-6">{restaurant.name} - Gerenciamento</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-white shadow-md rounded-xl">
          <TabsTrigger value="profile" className="flex items-center justify-center">
            <User className="h-4 w-4 mr-2" /> Perfil
          </TabsTrigger>
          <TabsTrigger value="links" className="flex items-center justify-center">
            <Link className="h-4 w-4 mr-2" /> Links
          </TabsTrigger>
          <TabsTrigger value="gallery" className="flex items-center justify-center">
            <Image className="h-4 w-4 mr-2" /> Galeria
          </TabsTrigger>
        </TabsList>

        {/* PROFILE TAB (Informações Básicas e Links de Contato) */}
        <TabsContent value="profile" className="mt-4">
          <Card className="shadow-xl border-none rounded-xl">
            <CardHeader>
              <CardTitle className="text-xl text-primary">Informações Básicas</CardTitle>
              <CardDescription>Atualize o nome, descrição e categoria do seu restaurante.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Placeholder para formulário de edição de perfil */}
              <p className="text-sm text-gray-500">Formulário de Perfil Básico (Em desenvolvimento)</p>
              
              <h3 className="text-lg font-semibold mb-2 text-primary">
                Links e Contato
              </h3>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {/* WhatsApp Link - AGORA BLOQUEADO PARA FREE */}
                <InfoCardItem 
                  label="Link do WhatsApp" 
                  value={restaurant?.whatsapp_url || "Não definido"} 
                  isLocked={areExternalLinksLocked}
                />
                {/* iFood Link */}
                <InfoCardItem 
                  label="Link do iFood" 
                  value={restaurant?.ifood_url || "Não definido"} 
                  isLocked={areExternalLinksLocked}
                />
                {/* Outro Link */}
                <InfoCardItem 
                  label="Outro Link" 
                  value={restaurant?.other_url || "Não definido"} 
                  isLocked={areExternalLinksLocked}
                />
              </div>
              
              <div className="mt-6">
                <Button 
                  variant="destructive" 
                  onClick={signOut} 
                  className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl"
                  disabled={authLoading}
                >
                  <LogOut className="mr-2 h-4 w-4" /> Sair da Conta
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LINKS TAB (Formulário de Edição) */}
        <TabsContent value="links" className="mt-4">
          <Card className="shadow-xl border-none rounded-xl">
            <CardHeader>
              <CardTitle className="text-xl text-primary">Links Externos</CardTitle>
              <CardDescription>
                Adicione links para WhatsApp, iFood e outros sites.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RestaurantLinksForm restaurant={restaurant} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* GALLERY TAB (Navegação para a página de gerenciamento) */}
        <TabsContent value="gallery" className="mt-4">
          <NavCardItem 
            label="Gerenciar Galeria" 
            description="Adicione, edite e remova fotos do seu perfil."
            icon={Image} 
            onClick={() => navigate(createPageUrl('restaurant-area/gallery'))}
            isPremiumFeature={true}
            isPremium={isPremium}
          />
        </TabsContent>
        
      </Tabs>
    </div>
  );
}