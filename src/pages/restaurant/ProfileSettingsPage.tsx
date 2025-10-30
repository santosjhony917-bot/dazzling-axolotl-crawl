"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Link, MapPin, MessageCircle, Utensils, Clock, Image, Pencil, Phone, Mail, FileText, Globe } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InfoCardItem } from '@/components/InfoCardItem';
import { SalesChannelsSection } from '@/components/SalesChannelsSection';
import { GeneralInfoSection } from '@/components/GeneralInfoSection';
import { LocationSection } from '@/components/LocationSection';
import { ContactSection } from '@/components/ContactSection';
import { DocumentsSection } from '@/components/DocumentsSection';
import { HoursSection } from '@/components/HoursSection';
import { GallerySection } from '@/components/GallerySection';
import { LogoSection } from '@/components/LogoSection';
import { CoverImageSection } from '@/components/CoverImageSection';

import { PublicRestaurantData } from '@/types/restaurant';
import { fetchPublicRestaurantById } from '@/integrations/supabase/restaurants';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { ModalType, useModal } from '@/hooks/useModal';
import { UpdateRestaurantPayload } from '@/types/payloads';
import { updateRestaurant } from '@/integrations/supabase/mutations';

const ProfileSettingsPage: React.FC = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const { openModal } = useModal();
  const [isOwner, setIsOwner] = useState(false);

  const { data: restaurant, isLoading, refetch } = useQuery<PublicRestaurantData>({
    queryKey: ['restaurantProfile', restaurantId],
    queryFn: () => fetchPublicRestaurantById(restaurantId!),
    enabled: !!restaurantId,
  });

  useEffect(() => {
    if (restaurant && user) {
      setIsOwner(restaurant.user_id === user.id);
    }
  }, [restaurant, user]);

  const handleUpdate = useCallback(async (payload: UpdateRestaurantPayload) => {
    if (!restaurantId) return;

    try {
      await updateRestaurant(restaurantId, payload);
      toast({
        title: "Sucesso",
        description: "Informações atualizadas com sucesso.",
      });
      refetch();
    } catch (error) {
      console.error("Failed to update restaurant:", error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar as informações do restaurante.",
        variant: "destructive",
      });
    }
  }, [restaurantId, refetch, toast]);

  const salesChannelItems = useMemo(() => {
    if (!restaurant) return [];

    return [
      {
        label: 'WhatsApp',
        value: restaurant.whatsapp_url,
        icon: MessageCircle,
        onClick: () => openModal(ModalType.UpdateSalesChannel, { field: 'whatsapp_url', initialValue: restaurant.whatsapp_url, onUpdate: handleUpdate }),
      },
      {
        label: 'iFood',
        value: restaurant.ifood_url,
        icon: Utensils,
        onClick: () => openModal(ModalType.UpdateSalesChannel, { field: 'ifood_url', initialValue: restaurant.ifood_url, onUpdate: handleUpdate }),
      },
      {
        label: 'Outro Link',
        value: restaurant.other_url,
        icon: Globe,
        onClick: () => openModal(ModalType.UpdateSalesChannel, { field: 'other_url', initialValue: restaurant.other_url, onUpdate: handleUpdate }),
      },
      // O item 'Link Externo (Geral)' associado a external_url foi removido conforme solicitado na interação anterior.
    ];
  }, [restaurant, openModal, handleUpdate]);

  const generalInfoData = useMemo(() => {
    if (!restaurant) return null;
    return {
      name: restaurant.name,
      description: restaurant.description,
      category: restaurant.category,
    };
  }, [restaurant]);

  const locationData = useMemo(() => {
    if (!restaurant) return null;
    return {
      address: restaurant.address,
      number: restaurant.number,
      neighborhood: restaurant.neighborhood,
      city: restaurant.city,
      state: restaurant.state,
      cep: restaurant.cep,
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
    };
  }, [restaurant]);

  const contactData = useMemo(() => {
    if (!restaurant) return null;
    return {
      phone: restaurant.phone,
      email: restaurant.email,
    };
  }, [restaurant]);

  const documentsData = useMemo(() => {
    if (!restaurant) return null;
    return {
      cnpj: restaurant.cnpj,
    };
  }, [restaurant]);

  const hoursData = useMemo(() => {
    if (!restaurant) return null;
    return {
      opening_hours: restaurant.opening_hours,
    };
  }, [restaurant]);

  const logoData = useMemo(() => {
    if (!restaurant) return null;
    return {
      logoUrl: restaurant.image_url || '',
    };
  }, [restaurant]);

  const coverImageData = useMemo(() => {
    if (!restaurant) return null;
    return {
      coverImageUrl: restaurant.cover_image_url || '',
    };
  }, [restaurant]);


  if (isLoading) {
    return <div className="p-4 text-center">Carregando configurações do restaurante...</div>;
  }

  if (!restaurant) {
    return <div className="p-4 text-center">Restaurante não encontrado.</div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto bg-white">
      <h1 className="text-3xl font-bold mb-6 text-primary">Configurações do Perfil</h1>

      <div className="space-y-8">
        {/* Imagens */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Image className="w-5 h-5 text-primary" />
              <span>Imagens</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <LogoSection data={logoData} isOwner={isOwner} onUpdate={handleUpdate} />
            <Separator />
            <CoverImageSection data={coverImageData} isOwner={isOwner} onUpdate={handleUpdate} />
          </CardContent>
        </Card>

        {/* Informações Gerais */}
        <GeneralInfoSection data={generalInfoData} isOwner={isOwner} onUpdate={handleUpdate} />

        {/* Localização */}
        <LocationSection data={locationData} isOwner={isOwner} onUpdate={handleUpdate} />

        {/* Contato */}
        <ContactSection data={contactData} isOwner={isOwner} onUpdate={handleUpdate} />

        {/* Documentos */}
        <DocumentsSection data={documentsData} isOwner={isOwner} onUpdate={handleUpdate} />

        {/* Horário de Funcionamento */}
        <HoursSection data={hoursData} isOwner={isOwner} onUpdate={handleUpdate} />

        {/* Canais de Venda */}
        <SalesChannelsSection items={salesChannelItems} isOwner={isOwner} />

        {/* Galeria de Fotos */}
        <GallerySection restaurantId={restaurantId!} isOwner={isOwner} />
      </div>
    </div>
  );
};

export default ProfileSettingsPage;