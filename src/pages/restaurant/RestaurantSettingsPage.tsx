"use client";

import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useRestaurant } from '@/hooks/useRestaurant';
import Header from '@/components/Header';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Settings, Utensils, Image as ImageIcon, Clock, MapPin, Info, Edit, FileText, Briefcase, Phone, Mail, Percent, CreditCard, Globe } from 'lucide-react';
import { ImageUploadButton } from '@/components/ImageUploadButton';
import { RESTAURANT_IMAGES_BUCKET } from '@/integrations/supabase/storage';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Separator } from '@/components/ui/separator';

const SettingsCard = ({ title, description, link, icon: Icon }) => (
  <Link to={link} className="block p-4 bg-white rounded-xl shadow-none hover:shadow-none transition-shadow border border-gray-200">
    <div className="flex items-center">
      <Icon className="w-6 h-6 mr-4 text-primary" />
      <div>
        <h3 className="font-semibold text-lg">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
      <Edit className="w-5 h-5 ml-auto text-gray-400" />
    </div>
  </Link>
);

const RestaurantSettingsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { restaurant, isLoading, error, mutate } = useRestaurant(id);

  const handleCoverImageUpload = async (url: string) => {
    if (!id) return;
    try {
      const { error } = await supabase
        .from('restaurants')
        .update({ cover_image_url: url })
        .eq('id', id);

      if (error) throw error;

      toast.success('Imagem de capa atualizada com sucesso!');
      mutate(); // Re-fetch restaurant data
    } catch (error) {
      console.error('Erro ao atualizar imagem de capa:', error);
      toast.error('Não foi possível atualizar a imagem de capa.');
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-8 w-1/2 mb-4" />
        <Skeleton className="h-48 w-full mb-6" />
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (error || !restaurant) {
    return <div>Restaurante não encontrado ou erro ao carregar.</div>;
  }

  return (
    <>
      <Helmet>
        <title>Configurações do Restaurante - {restaurant.name}</title>
      </Helmet>
      <div className="bg-gray-50 min-h-screen">
        <Header
          title="Configurações"
          leftAction={{ icon: ArrowLeft, onClick: () => navigate(`/restaurant/${id}`) }}
        />

        <div className="container mx-auto px-4 py-6">
          <div className="relative z-0 w-full h-48 bg-gray-200 rounded-xl mb-6 group">
            <img
              src={restaurant.cover_image_url || 'https://via.placeholder.com/800x300'}
              alt="Imagem de capa do restaurante"
              className="w-full h-full object-cover rounded-xl"
            />
            <div className="absolute inset-0 bg-black/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <ImageUploadButton
                onUploadComplete={handleCoverImageUpload}
                bucketName={RESTAURANT_IMAGES_BUCKET}
                folderPath={`${id}/cover`}
                className="relative"
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
                <h2 className="text-xl font-bold">Informações Básicas</h2>
                <div className="space-y-3">
                    <SettingsCard title="Nome e Categoria" description={restaurant.name} link={`/restaurant/${id}/edit/basic`} icon={FileText} />
                    <SettingsCard title="Contatos" description="E-mail e Telefone" link={`/restaurant/${id}/edit/contact`} icon={Phone} />
                    <SettingsCard title="Documentos" description="CNPJ" link={`/restaurant/${id}/edit/documents`} icon={Briefcase} />
                </div>
            </div>
            
            <Separator />

            <div className="space-y-2">
                <h2 className="text-xl font-bold">Localização e Horários</h2>
                <div className="space-y-3">
                    <SettingsCard title="Endereço Principal" description={restaurant.address || 'Não definido'} link={`/restaurant/${id}/edit/address`} icon={MapPin} />
                    <SettingsCard title="Horário de Funcionamento" description="Dias e horários de abertura" link={`/restaurant/${id}/edit/hours`} icon={Clock} />
                </div>
            </div>

            <Separator />

            <div className="space-y-2">
                <h2 className="text-xl font-bold">Cardápio e Aparência</h2>
                <div className="space-y-3">
                    <SettingsCard title="Gerenciar Cardápio" description="Categorias e itens" link={`/restaurant/${id}/menu`} icon={Utensils} />
                    <SettingsCard title="Galeria de Fotos" description="Fotos do ambiente e pratos" link={`/restaurant/${id}/edit/gallery`} icon={ImageIcon} />
                </div>
            </div>

            <Separator />

            <div className="space-y-2">
                <h2 className="text-xl font-bold">Pedidos e Pagamentos</h2>
                <div className="space-y-3">
                    <SettingsCard title="Canais de Pedido" description="WhatsApp, iFood, etc." link={`/restaurant/${id}/edit/order-channels`} icon={Globe} />
                    <SettingsCard title="Formas de Pagamento" description="Cartões, Pix, etc." link={`/restaurant/${id}/edit/payment-methods`} icon={CreditCard} />
                </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RestaurantSettingsPage;