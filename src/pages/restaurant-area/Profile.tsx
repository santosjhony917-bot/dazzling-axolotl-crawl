import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/context/AuthContext';
import { useRestaurantProfile } from '@/hooks/useRestaurantProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Utensils, MapPin, Phone, Mail, FileText, Tag, Globe, Clock, AlertTriangle } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { createPageUrl } from '@/utils/url';
import { Restaurant } from '@/types/supabase';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CATEGORIES } from '@/constants/categories';
import { WeekSchedule } from '@/types/schedule';
import ScheduleEditor from '@/components/restaurant/ScheduleEditor';

export default function RestaurantProfilePage() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuthContext();
  const userId = user?.id || null;

  // Usando o hook atualizado para buscar pelo user ID
  const { 
    restaurant, 
    isLoading: restaurantLoading, 
    updateRestaurant, 
    refetchProfile,
    isUpdating // <-- Destructuring isUpdating
  } = useRestaurantProfile(); 

  const [formData, setFormData] = useState<Partial<Restaurant>>({});
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);

  useEffect(() => {
    if (restaurant) {
      setFormData({
        name: restaurant.name,
        description: restaurant.description,
        image_url: restaurant.image_url,
        cover_image_url: restaurant.cover_image_url,
        phone: restaurant.phone,
        email: restaurant.email,
        cnpj: restaurant.cnpj,
        category: restaurant.category,
        whatsapp_url: restaurant.whatsapp_url,
        ifood_url: restaurant.ifood_url,
        other_url: restaurant.other_url,
        address: restaurant.address,
        number: restaurant.number,
        neighborhood: restaurant.neighborhood,
        city: restaurant.city,
        state: restaurant.state,
        cep: restaurant.cep,
        latitude: restaurant.latitude,
        longitude: restaurant.longitude,
        opening_hours: restaurant.opening_hours,
        external_url: restaurant.external_url,
      });
    }
  }, [restaurant]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id: string, value: string) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleScheduleSave = useCallback((schedule: WeekSchedule) => {
    setFormData(prev => ({ ...prev, opening_hours: schedule }));
    setIsEditingSchedule(false);
    showSuccess("Horário salvo localmente. Clique em 'Salvar Alterações' para finalizar.");
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;

    try {
      // Only send fields that have changed or are necessary
      await updateRestaurant(formData);
      // refetchProfile is called inside useRestaurantProfile mutation success handler
    } catch (error) {
      // Error handled by useRestaurantProfile hook
    }
  };

  if (authLoading || restaurantLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Acesso Negado</h2>
        <p className="text-gray-600 mb-6">Você precisa ter um restaurante registrado para acessar esta página.</p>
        <Button onClick={() => navigate(createPageUrl('index'))}>
          Voltar para o Início
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary">Perfil do Restaurante: {restaurant.name}</h1>
      <p className="text-gray-600">Gerencie as informações básicas e de contato do seu estabelecimento.</p>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Utensils className="w-5 h-5" /> Detalhes Principais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nome do Restaurante</label>
              <Input id="name" value={formData.name || ''} onChange={handleChange} required />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <Textarea id="description" value={formData.description || ''} onChange={handleChange} rows={4} />
            </div>
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <Select value={formData.category || ''} onValueChange={(value) => handleSelectChange('category', value)}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Selecione a categoria principal" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="image_url" className="block text-sm font-medium text-gray-700 mb-1">URL da Logo</label>
              <Input id="image_url" type="url" value={formData.image_url || ''} onChange={handleChange} />
            </div>
            <div>
              <label htmlFor="cover_image_url" className="block text-sm font-medium text-gray-700 mb-1">URL da Imagem de Capa</label>
              <Input id="cover_image_url" type="url" value={formData.cover_image_url || ''} onChange={handleChange} />
            </div>
          </CardContent>
        </Card>

        {/* Contato e Canais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Phone className="w-5 h-5" /> Contato e Canais de Pedido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <Input id="phone" value={formData.phone || ''} onChange={handleChange} />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <Input id="email" type="email" value={formData.email || ''} onChange={handleChange} />
            </div>
            <div>
              <label htmlFor="whatsapp_url" className="block text-sm font-medium text-gray-700 mb-1">Link WhatsApp</label>
              <Input id="whatsapp_url" type="url" value={formData.whatsapp_url || ''} onChange={handleChange} placeholder="https://wa.me/..." />
            </div>
            <div>
              <label htmlFor="ifood_url" className="block text-sm font-medium text-gray-700 mb-1">Link iFood</label>
              <Input id="ifood_url" type="url" value={formData.ifood_url || ''} onChange={handleChange} placeholder="https://ifood.com.br/..." />
            </div>
            <div>
              <label htmlFor="other_url" className="block text-sm font-medium text-gray-700 mb-1">Outro Link de Pedido</label>
              <Input id="other_url" type="url" value={formData.other_url || ''} onChange={handleChange} placeholder="https://seusite.com/pedido" />
            </div>
            <div>
              <label htmlFor="external_url" className="block text-sm font-medium text-gray-700 mb-1">Link Externo (Perfil Premium)</label>
              <Input id="external_url" type="url" value={formData.external_url || ''} onChange={handleChange} placeholder="Link para seu site principal" />
            </div>
          </CardContent>
        </Card>

        {/* Endereço */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <MapPin className="w-5 h-5" /> Localização
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="cep" className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
              <Input id="cep" value={formData.cep || ''} onChange={handleChange} />
            </div>
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Rua/Avenida</label>
              <Input id="address" value={formData.address || ''} onChange={handleChange} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="number" className="block text-sm font-medium text-gray-700 mb-1">Número</label>
                <Input id="number" value={formData.number || ''} onChange={handleChange} />
              </div>
              <div>
                <label htmlFor="neighborhood" className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
                <Input id="neighborhood" value={formData.neighborhood || ''} onChange={handleChange} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                <Input id="city" value={formData.city || ''} onChange={handleChange} />
              </div>
              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">Estado (UF)</label>
                <Input id="state" value={formData.state || ''} onChange={handleChange} maxLength={2} />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">Latitude e Longitude serão atualizadas automaticamente se o endereço for válido.</p>
          </CardContent>
        </Card>

        {/* Horário de Funcionamento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Clock className="w-5 h-5" /> Horário de Funcionamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEditingSchedule ? (
              <ScheduleEditor 
                initialSchedule={formData.opening_hours as WeekSchedule} 
                onSave={handleScheduleSave} 
                onCancel={() => setIsEditingSchedule(false)}
              />
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-700">
                  {formData.opening_hours ? "Horário configurado." : "Nenhum horário configurado."}
                </p>
                <Button type="button" variant="outline" onClick={() => setIsEditingSchedule(true)}>
                  {formData.opening_hours ? "Editar Horário" : "Configurar Horário"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={restaurantLoading || isUpdating}>
          {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
          Salvar Alterações
        </Button>
      </form>
    </div>
  );
}