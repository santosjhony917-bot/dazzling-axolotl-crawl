"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthData } from '@/context/AuthContext';
import { useRestaurantProfile } from '@/hooks/useRestaurantProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Utensils, MapPin, Info, Image as ImageIcon, Clock } from 'lucide-react'; // Importando Clock
import { showError, showSuccess } from '@/utils/toast';
import SubscriptionSupportSection from '@/components/restaurant/profile/SubscriptionSupportSection';
import SalesChannelsSection from '@/components/restaurant/profile/SalesChannelsSection';
import OpeningHoursSection from '@/components/restaurant/profile/OpeningHoursSection'; // Importando OpeningHoursSection
import PaymentMethodsSection from '@/components/restaurant/profile/PaymentMethodsSection'; // Importando PaymentMethodsSection
import SocialNetworksSection from '@/components/restaurant/profile/SocialNetworksSection'; // Importando SocialNetworksSection
import { Restaurant } from '@/types/supabase';

const ProfileSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { restaurant, isProfileLoading, isPremium, refetchProfile } = useAuthData();
  const { updateRestaurant } = useRestaurantProfile(restaurant);

  const [name, setName] = useState(restaurant?.name || '');
  const [description, setDescription] = useState(restaurant?.description || '');
  const [category, setCategory] = useState(restaurant?.category || '');
  const [address, setAddress] = useState(restaurant?.address || '');
  const [number, setNumber] = useState(restaurant?.number || '');
  const [neighborhood, setNeighborhood] = useState(restaurant?.neighborhood || '');
  const [city, setCity] = useState(restaurant?.city || '');
  const [state, setState] = useState(restaurant?.state || '');
  const [cep, setCep] = useState(restaurant?.cep || '');
  const [imageUrl, setImageUrl] = useState(restaurant?.image_url || '');
  const [coverImageUrl, setCoverImageUrl] = useState(restaurant?.cover_image_url || '');

  useEffect(() => {
    if (restaurant) {
      setName(restaurant.name || '');
      setDescription(restaurant.description || '');
      setCategory(restaurant.category || '');
      setAddress(restaurant.address || '');
      setNumber(restaurant.number || '');
      setNeighborhood(restaurant.neighborhood || '');
      setCity(restaurant.city || '');
      setState(restaurant.state || '');
      setCep(restaurant.cep || '');
      setImageUrl(restaurant.image_url || '');
      setCoverImageUrl(restaurant.cover_image_url || '');
    }
  }, [restaurant]);

  const handleSaveBasicInfo = async () => {
    if (!restaurant) {
      showError('Nenhum restaurante encontrado para atualizar.');
      return;
    }

    const updatedFields: Partial<Restaurant> = {
      name,
      description,
      category,
      image_url: imageUrl,
      cover_image_url: coverImageUrl,
    };

    try {
      await updateRestaurant(updatedFields);
      await refetchProfile();
      showSuccess('Informações básicas atualizadas com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar informações básicas:', error);
      showError('Erro ao atualizar informações básicas. Tente novamente.');
    }
  };

  const handleSaveAddress = async () => {
    if (!restaurant) {
      showError('Nenhum restaurante encontrado para atualizar.');
      return;
    }

    const updatedFields: Partial<Restaurant> = {
      address,
      number,
      neighborhood,
      city,
      state,
      cep,
    };

    try {
      await updateRestaurant(updatedFields);
      await refetchProfile();
      showSuccess('Endereço atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar endereço:', error);
      showError('Erro ao atualizar endereço. Tente novamente.');
    }
  };

  if (isProfileLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="container mx-auto p-4 text-center">
        <h1 className="text-2xl font-bold text-[#022D68] mb-4">Configurações do Perfil</h1>
        <p className="text-gray-600">Você precisa ter um restaurante registrado para acessar esta página.</p>
        <Button onClick={() => navigate('/claim-restaurant')} className="mt-4 bg-[#E47948] hover:bg-[#C2653B]">
          Registrar Restaurante
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold text-[#022D68] mb-6">Configurações do Perfil do Restaurante</h1>

      {/* Basic Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Info className="mr-2 h-5 w-5" /> Informações Básicas</CardTitle>
          <CardDescription>Nome, descrição e categoria do seu restaurante.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Nome do Restaurante</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
          </div>
          <div>
            <Label htmlFor="category">Categoria</Label>
            <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="imageUrl">URL da Imagem do Perfil</Label>
            <Input id="imageUrl" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
            {imageUrl && <img src={imageUrl} alt="Preview" className="mt-2 h-24 w-24 object-cover rounded-md" />}
          </div>
          <div>
            <Label htmlFor="coverImageUrl">URL da Imagem de Capa</Label>
            <Input id="coverImageUrl" value={coverImageUrl} onChange={(e) => setCoverImageUrl(e.target.value)} />
            {coverImageUrl && <img src={coverImageUrl} alt="Preview" className="mt-2 h-24 w-full object-cover rounded-md" />}
          </div>
          <Button onClick={handleSaveBasicInfo} className="w-full bg-[#E47948] hover:bg-[#C2653B]">Salvar Informações Básicas</Button>
        </CardContent>
      </Card>

      {/* Address Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><MapPin className="mr-2 h-5 w-5" /> Endereço</CardTitle>
          <CardDescription>Detalhes do endereço do seu restaurante.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="address">Rua/Avenida</Label>
            <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="number">Número</Label>
              <Input id="number" value={number} onChange={(e) => setNumber(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="neighborhood">Bairro</Label>
              <Input id="neighborhood" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city">Cidade</Label>
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="state">Estado</Label>
              <Input id="state" value={state} onChange={(e) => setState(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="cep">CEP</Label>
              <Input id="cep" value={cep} onChange={(e) => setCep(e.target.value)} />
            </div>
          </div>
          <Button onClick={handleSaveAddress} className="w-full bg-[#E47948] hover:bg-[#C2653B]">Salvar Endereço</Button>
        </CardContent>
      </Card>

      {/* Sales Channels Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Utensils className="mr-2 h-5 w-5" /> Canais de Venda</CardTitle>
          <CardDescription>Links para WhatsApp, iFood, site e outros canais de pedido.</CardDescription>
        </CardHeader>
        <CardContent>
          <SalesChannelsSection restaurant={restaurant} />
        </CardContent>
      </Card>

      {/* Opening Hours Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Clock className="mr-2 h-5 w-5" /> Horário de Funcionamento</CardTitle>
          <CardDescription>Defina os horários de abertura e fechamento do seu restaurante.</CardDescription>
        </CardHeader>
        <CardContent>
          <OpeningHoursSection restaurant={restaurant} />
        </CardContent>
      </Card>

      {/* Payment Methods Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Info className="mr-2 h-5 w-5" /> Métodos de Pagamento</CardTitle>
          <CardDescription>Gerencie os métodos de pagamento aceitos.</CardDescription>
        </CardHeader>
        <CardContent>
          <PaymentMethodsSection restaurant={restaurant} />
        </CardContent>
      </Card>

      {/* Social Networks Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Info className="mr-2 h-5 w-5" /> Redes Sociais</CardTitle>
          <CardDescription>Adicione links para suas redes sociais.</CardDescription>
        </CardHeader>
        <CardContent>
          <SocialNetworksSection restaurant={restaurant} />
        </CardContent>
      </Card>

      {/* Subscription and Support Card */}
      <SubscriptionSupportSection isPremium={isPremium} />
    </div>
  );
};

export default ProfileSettingsPage;