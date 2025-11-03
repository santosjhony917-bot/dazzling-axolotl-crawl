"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PublicRestaurantData } from '@/types/restaurant';
import FreeProfileLayout from '@/components/public/FreeProfileLayout';
import PremiumProfileLayout from '@/components/public/PremiumProfileLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CATEGORIES } from '@/constants/categories'; // Corrected import from 'categories' to 'CATEGORIES'
import { useAuthData } from '@/context/AuthContext';
import { toast } from 'sonner';

const Upgrade = () => {
  const navigate = useNavigate();
  const { user } = useAuthData();
  const [restaurant, setRestaurant] = useState<PublicRestaurantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewPlan, setPreviewPlan] = useState<'free' | 'premium'>('free');

  // Form states for creating a dummy restaurant
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');

  useEffect(() => {
    const fetchUserRestaurant = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        setError(error.message);
        setRestaurant(null);
      } else if (data) {
        setRestaurant(data as PublicRestaurantData);
        setName(data.name || '');
        setDescription(data.description || '');
        setCategory(data.category || '');
        setImageUrl(data.image_url || '');
        setCoverImageUrl(data.cover_image_url || '');
      } else {
        // No restaurant found, initialize with empty data
        setRestaurant({
          id: 'preview-id',
          user_id: user.id,
          name: 'Nome do Restaurante',
          description: 'Descrição do seu restaurante. Fale sobre sua culinária, ambiente e diferenciais.',
          image_url: '/placeholder-restaurant.jpg',
          cover_image_url: '/placeholder-cover.jpg',
          plan: 'free',
          phone: null,
          email: null,
          cnpj: null,
          category: 'Geral',
          whatsapp_url: null,
          ifood_url: null,
          other_url: null,
          address: 'Rua Exemplo',
          number: '123',
          neighborhood: 'Bairro Teste',
          city: 'Cidade Exemplo',
          state: 'UF',
          cep: '00000-000',
          latitude: null,
          longitude: null,
          opening_hours: null,
          created_at: new Date().toISOString(),
          external_url: null,
          followers_override: 0,
          payment_methods: null,
          social_networks: null,
          other_url_label: null,
          is_favorite: false,
          followers_count: 0,
          addressSummary: 'Rua Exemplo, 123',
          logoUrl: '/placeholder-restaurant.jpg',
          isOpen: false,
          statusText: 'Fechado',
          nextOpenTime: null,
          menu_categories: [],
          gallery_images: [],
        });
      }
      setLoading(false);
    };

    fetchUserRestaurant();
  }, [user]);

  const handleUpdatePreview = () => {
    if (restaurant) {
      setRestaurant({
        ...restaurant,
        name,
        description,
        category,
        image_url: imageUrl || '/placeholder-restaurant.jpg',
        cover_image_url: coverImageUrl || '/placeholder-cover.jpg',
        plan: previewPlan,
      });
      toast.success('Prévia atualizada!');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Carregando...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center min-h-screen text-red-500">Erro: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Gerenciar Plano e Prévia</h1>

      <Card className="mb-8 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary">Seu Plano Atual</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg mb-4">
            Você está atualmente no plano <span className="font-semibold text-blue-600">{restaurant?.plan === 'premium' || restaurant?.plan === 'premium_gift' ? 'Premium' : 'Grátis'}</span>.
          </p>
          <Button onClick={() => toast.info('Funcionalidade de upgrade em desenvolvimento!')}>
            Fazer Upgrade para Premium
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-8 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary">Configurar Prévia do Perfil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Nome do Restaurante</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="category">Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => ( // Changed to CATEGORIES
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="imageUrl">URL da Imagem do Perfil</Label>
            <Input id="imageUrl" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="/placeholder-restaurant.jpg" />
          </div>
          <div>
            <Label htmlFor="coverImageUrl">URL da Imagem de Capa</Label>
            <Input id="coverImageUrl" value={coverImageUrl} onChange={(e) => setCoverImageUrl(e.target.value)} placeholder="/placeholder-cover.jpg" />
          </div>
          <div>
            <Label>Plano para Prévia</Label>
            <RadioGroup value={previewPlan} onValueChange={(value: 'free' | 'premium') => setPreviewPlan(value)} className="flex space-x-4 mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="free" id="preview-free" />
                <Label htmlFor="preview-free">Grátis</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="premium" id="preview-premium" />
                <Label htmlFor="preview-premium">Premium</Label>
              </div>
            </RadioGroup>
          </div>
          <Button onClick={handleUpdatePreview}>Atualizar Prévia</Button>
        </CardContent>
      </Card>

      {restaurant && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Prévia do Perfil</h2>
          {previewPlan === 'free' ? (
            <FreeProfileLayout
              restaurant={restaurant}
              toggleFavorite={() => toast.info('Funcionalidade de favoritar desabilitada na prévia.')}
              isFavoriteMutating={false}
              isCompact={true}
            />
          ) : (
            <PremiumProfileLayout
              restaurant={restaurant}
              toggleFavorite={() => toast.info('Funcionalidade de favoritar desabilitada na prévia.')}
              isFavoriteMutating={false}
              isCompact={true}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default Upgrade;