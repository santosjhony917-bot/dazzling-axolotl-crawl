import React, { useState, useEffect } from 'react';
import { useRestaurant } from '@/hooks/useRestaurant';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Save, Utensils, MapPin, Clock, Phone, Mail, Link, Image as ImageIcon, Crown } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant } from '@/types/supabase';
import SubscriptionCard from '@/components/restaurant/profile/SubscriptionCard';
import LocationForm from '@/components/restaurant/profile/LocationForm';
import OpeningHoursForm from '@/components/restaurant/profile/OpeningHoursForm';
import ImageUpload from '@/components/ImageUpload';
import { Separator } from '@/components/ui/separator';
import { useQueryClient } from '@tanstack/react-query';

// Tipagem para o estado do formulário
interface RestaurantFormData {
  name: string;
  description: string;
  phone: string;
  email: string;
  category: string;
  whatsapp_url: string;
  ifood_url: string;
  other_url: string;
  external_url: string;
}

const ProfileSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { data: restaurant, isLoading: isRestaurantLoading, refetch } = useRestaurant();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<RestaurantFormData>({
    name: '',
    description: '',
    phone: '',
    email: '',
    category: '',
    whatsapp_url: '',
    ifood_url: '',
    other_url: '',
    external_url: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (restaurant) {
      setFormData({
        name: restaurant.name || '',
        description: restaurant.description || '',
        phone: restaurant.phone || '',
        email: restaurant.email || '',
        category: restaurant.category || '',
        whatsapp_url: restaurant.whatsapp_url || '',
        ifood_url: restaurant.ifood_url || '',
        other_url: restaurant.other_url || '',
        external_url: restaurant.external_url || '',
      });
    }
  }, [restaurant]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('restaurants')
        .update(formData)
        .eq('id', restaurant.id);

      if (error) throw error;

      showSuccess('Perfil atualizado com sucesso!');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['restaurant', restaurant.id] });
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      showError('Falha ao atualizar o perfil. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  // CORRIGIDO: Aceita url: string | null
  const handleImageUpload = async (url: string | null, field: 'image_url' | 'cover_image_url') => {
    if (!restaurant) return;

    try {
      const { error } = await supabase
        .from('restaurants')
        .update({ [field]: url })
        .eq('id', restaurant.id);

      if (error) throw error;

      showSuccess('Imagem atualizada com sucesso!');
      refetch();
    } catch (error) {
      console.error(`Erro ao atualizar ${field}:`, error);
      showError('Falha ao atualizar a imagem.');
    }
  };

  if (isRestaurantLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!restaurant) {
    return <p className="text-center text-red-500">Erro: Restaurante não encontrado ou você não tem permissão.</p>;
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-[#022D68]">Configurações do Restaurante</h1>
      <p className="text-gray-600">Gerencie as informações básicas, localização e plano de assinatura do seu estabelecimento.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Coluna 1 & 2: Formulários */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* 1. Informações Básicas */}
          <Card className="shadow-soft-lg border-none rounded-xl bg-white">
            <CardHeader>
              <CardTitle className="text-xl text-[#022D68] flex items-center gap-2"><Utensils className="w-5 h-5" /> Informações Gerais</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome do Restaurante</Label>
                  <Input id="name" value={formData.name} onChange={handleChange} required className="rounded-xl" />
                </div>
                <div>
                  <Label htmlFor="category">Categoria (Ex: Italiana, Japonesa)</Label>
                  <Input id="category" value={formData.category} onChange={handleChange} className="rounded-xl" />
                </div>
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea id="description" value={formData.description} onChange={handleChange} rows={3} className="rounded-xl" />
                </div>
                
                <Button type="submit" disabled={isSaving} className="w-full bg-highlight hover:bg-highlight/90 rounded-xl">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Salvar Informações
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* 2. Contato e Links */}
          <Card className="shadow-soft-lg border-none rounded-xl bg-white">
            <CardHeader>
              <CardTitle className="text-xl text-[#022D68] flex items-center gap-2"><Phone className="w-5 h-5" /> Contato e Redes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input id="phone" value={formData.phone} onChange={handleChange} className="rounded-xl" />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={formData.email} onChange={handleChange} className="rounded-xl" />
                </div>
                <Separator />
                <div>
                  <Label htmlFor="whatsapp_url">Link WhatsApp</Label>
                  <Input id="whatsapp_url" value={formData.whatsapp_url} onChange={handleChange} placeholder="https://wa.me/..." className="rounded-xl" />
                </div>
                <div>
                  <Label htmlFor="ifood_url">Link iFood</Label>
                  <Input id="ifood_url" value={formData.ifood_url} onChange={handleChange} placeholder="https://www.ifood.com.br/..." className="rounded-xl" />
                </div>
                <div>
                  <Label htmlFor="other_url">Outro Link (Ex: Instagram)</Label>
                  <Input id="other_url" value={formData.other_url} onChange={handleChange} placeholder="https://instagram.com/..." className="rounded-xl" />
                </div>
                <div>
                  <Label htmlFor="external_url">Link Externo Principal (Menu Próprio)</Label>
                  <Input id="external_url" value={formData.external_url} onChange={handleChange} placeholder="https://seumenu.com.br" className="rounded-xl" />
                </div>
                <Button type="submit" disabled={isSaving} className="w-full bg-highlight hover:bg-highlight/90 rounded-xl">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Salvar Contatos
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* 3. Localização */}
          <Card className="shadow-soft-lg border-none rounded-xl bg-white">
            <CardHeader>
              <CardTitle className="text-xl text-[#022D68] flex items-center gap-2"><MapPin className="w-5 h-5" /> Localização</CardTitle>
              <CardDescription>Atualize o endereço e as coordenadas GPS do seu restaurante.</CardDescription>
            </CardHeader>
            <CardContent>
              <LocationForm restaurant={restaurant} refetch={refetch} />
            </CardContent>
          </Card>

          {/* 4. Horário de Funcionamento */}
          <Card className="shadow-soft-lg border-none rounded-xl bg-white">
            <CardHeader>
              <CardTitle className="text-xl text-[#022D68] flex items-center gap-2"><Clock className="w-5 h-5" /> Horário de Funcionamento</CardTitle>
              <CardDescription>Defina os horários em que seu restaurante está aberto.</CardDescription>
            </CardHeader>
            <CardContent>
              <OpeningHoursForm restaurant={restaurant} refetch={refetch} />
            </CardContent>
          </Card>
        </div>

        {/* Coluna 3: Imagens e Assinatura */}
        <div className="lg:col-span-1 space-y-8">
          
          {/* 5. Imagem de Perfil */}
          <Card className="shadow-soft-lg border-none rounded-xl bg-white">
            <CardHeader>
              <CardTitle className="text-xl text-[#022D68] flex items-center gap-2"><ImageIcon className="w-5 h-5" /> Imagem de Perfil</CardTitle>
            </CardHeader>
            <CardContent>
              <ImageUpload
                bucket="restaurant_images"
                currentImageUrl={restaurant.image_url}
                onUploadSuccess={(url) => handleImageUpload(url, 'image_url')}
                folderPath={`restaurants/${restaurant.id}/profile`}
              />
              <p className="text-xs text-gray-500 mt-2">Logo ou foto principal do restaurante.</p>
            </CardContent>
          </Card>

          {/* 6. Imagem de Capa */}
          <Card className="shadow-soft-lg border-none rounded-xl bg-white">
            <CardHeader>
              <CardTitle className="text-xl text-[#022D68] flex items-center gap-2"><ImageIcon className="w-5 h-5" /> Imagem de Capa</CardTitle>
            </CardHeader>
            <CardContent>
              <ImageUpload
                bucket="restaurant_images"
                currentImageUrl={restaurant.cover_image_url}
                onUploadSuccess={(url) => handleImageUpload(url, 'cover_image_url')}
                folderPath={`restaurants/${restaurant.id}/cover`}
              />
              <p className="text-xs text-gray-500 mt-2">Imagem de fundo para o perfil.</p>
            </CardContent>
          </Card>

          {/* 7. Assinatura */}
          <SubscriptionCard restaurant={restaurant} />
        </div>
      </div>
    </div>
  );
};

export default ProfileSettingsPage;