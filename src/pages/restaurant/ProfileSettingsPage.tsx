import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import RestaurantProfileHeader from '@/components/public/RestaurantProfileHeader';
import ContentManagementSection from '@/components/restaurant/profile/ContentManagementSection';
import SubscriptionSupportSection from '@/components/restaurant/profile/SubscriptionSupportSection';
import PaymentMethodsDialog from '@/components/restaurant/profile/PaymentMethodsDialog';
import SocialNetworksDialog from '@/components/restaurant/profile/SocialNetworksDialog';
import SalesChannelsDialog from '@/components/restaurant/profile/SalesChannelsDialog';

const ProfileSettingsPage: React.FC = () => {
  const { restaurant, isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [isPaymentMethodsDialogOpen, setIsPaymentMethodsDialogOpen] = useState(false);
  const [isSocialNetworksDialogOpen, setIsSocialNetworksDialogOpen] = useState(false);
  const [isSalesChannelsDialogOpen, setIsSalesChannelsDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <Skeleton className="h-48 w-full rounded-lg mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !restaurant) {
    navigate('/login');
    return null;
  }

  const isPremium = restaurant.plan === 'premium';

  return (
    <div className="container mx-auto p-4">
      {/* 1. Header do Perfil do Restaurante */}
      <RestaurantProfileHeader
        restaurantId={restaurant.id}
        name={restaurant.name}
        description={restaurant.description || ''}
        imageUrl={restaurant.image_url || ''}
        coverImageUrl={restaurant.cover_image_url || ''}
        logoUrl={restaurant.image_url || ''} // Usando image_url como logo por enquanto
        isPremium={isPremium}
      />

      <Separator className="my-6" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* 2. Gerenciamento de Conteúdo */}
          <Card>
            <CardHeader>
              <CardTitle>Gerenciamento do Restaurante</CardTitle>
            </CardHeader>
            <CardContent>
              <ContentManagementSection
                restaurant={restaurant}
                setIsPaymentMethodsDialogOpen={setIsPaymentMethodsDialogOpen}
                setIsSocialNetworksDialogOpen={setIsSocialNetworksDialogOpen}
              />
            </CardContent>
          </Card>

          {/* 3. Configurações de Pedidos e Vendas */}
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Pedidos e Vendas</CardTitle>
            </CardHeader>
            <CardContent>
              <NavCardItem
                title="Canais de Venda"
                description="Gerencie seus canais de venda como WhatsApp, iFood, etc."
                icon={<span className="w-6 h-6 text-primary">🛒</span>} // Ícone temporário
                onClick={() => setIsSalesChannelsDialogOpen(true)}
                href="#"
              />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
          {/* 4. Assinatura e Suporte */}
          <Card>
            <CardHeader>
              <CardTitle>Assinatura e Suporte</CardTitle>
            </CardHeader>
            <CardContent>
              <SubscriptionSupportSection restaurantId={restaurant.id} />
            </CardContent>
          </Card>

          {/* 5. Outras Configurações (Exemplo) */}
          <Card>
            <CardHeader>
              <CardTitle>Outras Configurações</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                Configurações Avançadas
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <PaymentMethodsDialog
        isOpen={isPaymentMethodsDialogOpen}
        onClose={() => setIsPaymentMethodsDialogOpen(false)}
        restaurantId={restaurant.id}
        initialPaymentMethods={restaurant.payment_methods || []}
      />
      <SocialNetworksDialog
        isOpen={isSocialNetworksDialogOpen}
        onClose={() => setIsSocialNetworksDialogOpen(false)}
        restaurantId={restaurant.id}
        initialSocialNetworks={restaurant.social_networks || []}
      />
      <SalesChannelsDialog
        isOpen={isSalesChannelsDialogOpen}
        onClose={() => setIsSalesChannelsDialogOpen(false)}
        restaurantId={restaurant.id}
        initialWhatsappUrl={restaurant.whatsapp_url || ''}
        initialIfoodUrl={restaurant.ifood_url || ''}
        initialOtherUrl={restaurant.other_url || ''}
      />
    </div>
  );
};

export default ProfileSettingsPage;