import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Restaurant } from '@/types/supabase';
import { RestaurantProfile, SocialNetworkLink, WeekSchedule } from '@/types/restaurant'; // Corrigido para RestaurantProfile, SocialNetworkLink, WeekSchedule
import { getRestaurantOpenStatus } from '@/lib/schedule';
import { useRestaurantProfile } from '@/hooks/useRestaurantProfile';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import InfoCardItem from '@/components/InfoCardItem';
import SalesChannelsSection from '@/components/restaurant/profile/SalesChannelsSection';
import SocialNetworksDialog from '@/components/restaurant/SocialNetworksDialog';
import OpeningHoursDialog from '@/components/restaurant/OpeningHoursDialog';
import { DEFAULT_SCHEDULE } from '@/constants/schedule';

const ProfileSettingsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: restaurant, isLoading, error } = useRestaurantProfile(id || '');

  const [isEditingSalesChannels, setIsEditingSalesChannels] = useState(false);
  const [isSocialNetworksDialogOpen, setIsSocialNetworksDialogOpen] = useState(false);
  const [isOpeningHoursDialogOpen, setIsOpeningHoursDialogOpen] = useState(false);

  const handleEditSalesChannelsToggle = () => setIsEditingSalesChannels(!isEditingSalesChannels);
  const handleSocialNetworksDialogToggle = () => setIsSocialNetworksDialogOpen(!isSocialNetworksDialogOpen);
  const handleOpeningHoursDialogToggle = () => setIsOpeningHoursDialogOpen(!isOpeningHoursDialogOpen);

  const socialNetworks = useMemo(() => {
    return (restaurant?.social_networks || []) as SocialNetworkLink[];
  }, [restaurant?.social_networks]);

  const openingHours = useMemo(() => {
    return (restaurant?.opening_hours || DEFAULT_SCHEDULE) as WeekSchedule;
  }, [restaurant?.opening_hours]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-red-500">Erro ao carregar perfil: {error.message}</div>;
  }

  if (!restaurant) {
    return <div className="text-center text-gray-500">Restaurante não encontrado.</div>;
  }

  const { statusText } = getRestaurantOpenStatus(restaurant.opening_hours as WeekSchedule);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Configurações do Perfil</h1>

      <div className="grid gap-6">
        {/* Informações Básicas */}
        <Card className="p-6 shadow-sm">
          <h2 className="text-2xl font-semibold mb-4">Informações Básicas</h2>
          <div className="grid gap-4">
            <InfoCardItem label="Nome" value={restaurant.name} />
            <InfoCardItem label="Descrição" value={restaurant.description || 'N/A'} />
            <InfoCardItem label="Categoria" value={restaurant.category || 'N/A'} />
            <InfoCardItem label="Plano" value={restaurant.plan} />
          </div>
        </Card>

        {/* Contato */}
        <Card className="p-6 shadow-sm">
          <h2 className="text-2xl font-semibold mb-4">Contato</h2>
          <div className="grid gap-4">
            <InfoCardItem label="Telefone" value={restaurant.phone || 'N/A'} />
            <InfoCardItem label="Email" value={restaurant.email || 'N/A'} />
            <InfoCardItem label="CNPJ" value={restaurant.cnpj || 'N/A'} />
          </div>
        </Card>

        {/* Endereço */}
        <Card className="p-6 shadow-sm">
          <h2 className="text-2xl font-semibold mb-4">Endereço</h2>
          <div className="grid gap-4">
            <InfoCardItem label="Endereço" value={restaurant.address || 'N/A'} />
            <InfoCardItem label="Número" value={restaurant.number || 'N/A'} />
            <InfoCardItem label="Bairro" value={restaurant.neighborhood || 'N/A'} />
            <InfoCardItem label="Cidade" value={restaurant.city || 'N/A'} />
            <InfoCardItem label="Estado" value={restaurant.state || 'N/A'} />
            <InfoCardItem label="CEP" value={restaurant.cep || 'N/A'} />
            <InfoCardItem label="Latitude" value={restaurant.latitude?.toString() || 'N/A'} />
            <InfoCardItem label="Longitude" value={restaurant.longitude?.toString() || 'N/A'} />
          </div>
        </Card>

        {/* Horário de Funcionamento */}
        <Card className="p-6 shadow-sm">
          <h2 className="text-2xl font-semibold mb-4">Horário de Funcionamento</h2>
          <p className="mb-4">Status atual: <span className="font-medium">{statusText}</span></p>
          <Button onClick={handleOpeningHoursDialogToggle}>Editar Horário</Button>
        </Card>

        {/* Canais de Venda */}
        <Card className="p-6 shadow-sm">
          <SalesChannelsSection
            restaurant={restaurant}
            isEditing={isEditingSalesChannels}
            onEditToggle={handleEditSalesChannelsToggle}
          />
        </Card>

        {/* Redes Sociais */}
        <Card className="p-6 shadow-sm">
          <h2 className="text-2xl font-semibold mb-4">Redes Sociais</h2>
          <div className="grid gap-2">
            {socialNetworks.length > 0 ? (
              socialNetworks.map((link, index) => (
                <p key={index} className="text-gray-700">{link.platform}: <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{link.url}</a></p>
              ))
            ) : (
              <p className="text-gray-500">Nenhuma rede social configurada.</p>
            )}
          </div>
          <Button onClick={handleSocialNetworksDialogToggle} className="mt-4">Gerenciar Redes Sociais</Button>
        </Card>
      </div>

      <SocialNetworksDialog
        isOpen={isSocialNetworksDialogOpen}
        onClose={handleSocialNetworksDialogToggle}
        restaurantId={restaurant.id}
        initialSocialNetworks={socialNetworks}
      />

      <OpeningHoursDialog
        isOpen={isOpeningHoursDialogOpen}
        onClose={handleOpeningHoursDialogToggle}
        restaurantId={restaurant.id}
        initialOpeningHours={openingHours}
      />
    </div>
  );
};

export default ProfileSettingsPage;