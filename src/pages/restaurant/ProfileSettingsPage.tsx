"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthData } from '@/hooks/useAuthData';
import useRestaurantProfile from '@/hooks/useRestaurantProfile';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { showSuccess, showError } from '@/utils/toast';
import { Restaurant, PublicRestaurantData, SocialNetworkLink, RestaurantPlan } from '@/types/restaurant';
import { getRestaurantOpenStatus } from '@/lib/schedule';
import OpeningHoursEditor from '@/components/restaurant/OpeningHoursEditor';
import { WeekSchedule, DBWeekSchedule } from '@/types/schedule';
import SocialNetworksDialog from '@/components/restaurant/SocialNetworksDialog';
import { formatPrice } from '@/utils/formatters';

const ProfileSettingsPage: React.FC = () => {
  const { restaurant, isLoading: authLoading, isPremium, refetchProfile } = useAuthData();
  // Casting restaurant to BaseRestaurant (which is aliased as Restaurant) to satisfy useRestaurantProfile hook
  const { updateRestaurant } = useRestaurantProfile(restaurant as Restaurant); 

  const [formData, setFormData] = useState<Partial<Restaurant>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isHoursDialogOpen, setIsHoursDialogOpen] = useState(false);
  const [isSocialDialogOpen, setIsSocialDialogOpen] = useState(false);

  useEffect(() => {
    if (restaurant) {
      // Initialize form data with current restaurant data
      setFormData({
        ...restaurant,
        // Ensure opening_hours is DBWeekSchedule for the editor
        opening_hours: restaurant.opening_hours as DBWeekSchedule | null, 
        // Ensure payment_methods is string[] for the input
        payment_methods: (restaurant.payment_methods as unknown as string[] | null) || null,
        // Ensure social_networks is SocialNetworkLink[] for the dialog
        social_networks: (restaurant.social_networks as unknown as SocialNetworkLink[] | null) || null,
      });
    }
  }, [restaurant]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id: keyof Restaurant, value: string) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handlePaymentMethodsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const methods = value.split(',').map(m => m.trim()).filter(m => m.length > 0);
    setFormData(prev => ({ ...prev, payment_methods: methods }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;

    setIsSaving(true);
    try {
      // Prepare data for update, ensuring only necessary fields are sent
      const updateData: Partial<Restaurant> = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        phone: formData.phone,
        email: formData.email,
        whatsapp_url: formData.whatsapp_url,
        ifood_url: formData.ifood_url,
        other_url: formData.other_url,
        external_url: formData.external_url,
        address: formData.address,
        number: formData.number,
        neighborhood: formData.neighborhood,
        city: formData.city,
        state: formData.state,
        cep: formData.cep,
        opening_hours: formData.opening_hours,
        payment_methods: formData.payment_methods,
        social_networks: formData.social_networks,
      };

      await updateRestaurant(updateData);
      showSuccess('Perfil atualizado com sucesso!');
      refetchProfile(); // Refresh local data
    } catch (error) {
      console.error('Failed to update profile:', error);
      showError('Erro ao salvar o perfil.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleHoursSave = (schedule: DBWeekSchedule) => {
    setFormData(prev => ({ ...prev, opening_hours: schedule }));
    setIsHoursDialogOpen(false);
  };

  const handleSocialSave = async (links: SocialNetworkLink[]) => {
    setFormData(prev => ({ ...prev, social_networks: links }));
    // The actual saving to DB happens in handleSave, but we can trigger a partial save here if needed.
    // For simplicity, we rely on the main handleSave button, but we update the state here.
    // If the user closes the dialog, the state is updated, and the main save button will use it.
    // If we want to save immediately, we would call updateRestaurant here. Let's rely on the main save button.
    return Promise.resolve();
  };

  const currentStatus = useMemo(() => {
    if (!restaurant) return { isOpen: false, statusText: 'Carregando...' };
    // We need to pass the raw DB schedule type here
    return getRestaurantOpenStatus(restaurant.opening_hours as DBWeekSchedule | null);
  }, [restaurant]);

  if (authLoading || !restaurant) {
    return <LoadingSpinner />;
  }

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900">Configurações do Perfil</h1>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome do Restaurante</Label>
              <Input id="name" value={formData.name || ''} onChange={handleChange} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Categoria</Label>
              <Input id="category" value={formData.category || ''} onChange={handleChange} placeholder="Ex: Pizzaria, Hamburgueria" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" value={formData.description || ''} onChange={handleChange} rows={3} placeholder="Uma breve descrição do seu negócio." />
            </div>
          </CardContent>
        </Card>

        {/* Contato e Canais de Pedido */}
        <Card>
          <CardHeader>
            <CardTitle>Contato e Canais de Pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" value={formData.phone || ''} onChange={handleChange} placeholder="(XX) XXXXX-XXXX" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={formData.email || ''} onChange={handleChange} placeholder="contato@restaurante.com" />
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="whatsapp_url">Link WhatsApp</Label>
              <Input id="whatsapp_url" value={formData.whatsapp_url || ''} onChange={handleChange} placeholder="https://wa.me/..." />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ifood_url">Link iFood</Label>
              <Input id="ifood_url" value={formData.ifood_url || ''} onChange={handleChange} placeholder="https://www.ifood.com.br/delivery/..." />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="external_url">Link de Pedido Próprio (Site/App)</Label>
              <Input id="external_url" value={formData.external_url || ''} onChange={handleChange} placeholder="https://seusite.com/pedido" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="other_url">Outro Link (Opcional)</Label>
              <Input id="other_url" value={formData.other_url || ''} onChange={handleChange} placeholder="https://linktr.ee/..." />
            </div>
          </CardContent>
        </Card>

        {/* Endereço */}
        <Card>
          <CardHeader>
            <CardTitle>Endereço</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="address">Rua/Avenida</Label>
                <Input id="address" value={formData.address || ''} onChange={handleChange} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="number">Número</Label>
                <Input id="number" value={formData.number || ''} onChange={handleChange} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input id="neighborhood" value={formData.neighborhood || ''} onChange={handleChange} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="city">Cidade</Label>
                <Input id="city" value={formData.city || ''} onChange={handleChange} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="state">Estado (UF)</Label>
                <Input id="state" value={formData.state || ''} onChange={handleChange} maxLength={2} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cep">CEP</Label>
              <Input id="cep" value={formData.cep || ''} onChange={handleChange} placeholder="00000-000" />
            </div>
          </CardContent>
        </Card>

        {/* Horário de Funcionamento e Pagamento */}
        <Card>
          <CardHeader>
            <CardTitle>Horário e Outras Configurações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Horário */}
            <div className="space-y-2">
              <Label>Horário de Funcionamento</Label>
              <p className={`text-sm font-medium ${currentStatus.isOpen ? 'text-green-600' : 'text-red-600'}`}>
                Status Atual: {currentStatus.statusText}
              </p>
              <Button type="button" variant="outline" onClick={() => setIsHoursDialogOpen(true)}>
                Editar Horários
              </Button>
            </div>

            {/* Pagamento */}
            <div className="grid gap-2">
              <Label htmlFor="payment_methods">Formas de Pagamento (Separadas por vírgula)</Label>
              <Input 
                id="payment_methods" 
                value={(formData.payment_methods || []).join(', ')} 
                onChange={handlePaymentMethodsChange} 
                placeholder="Ex: Cartão de Crédito, Pix, Dinheiro"
              />
            </div>
            
            {/* Redes Sociais */}
            <div className="space-y-2">
              <Label>Redes Sociais</Label>
              <p className="text-sm text-gray-500">
                {formData.social_networks?.length || 0} links configurados.
              </p>
              <Button type="button" variant="outline" onClick={() => setIsSocialDialogOpen(true)}>
                Gerenciar Links
              </Button>
            </div>
            
            {/* Plano (Display only) */}
            <div className="space-y-2">
              <Label>Plano Atual</Label>
              <p className="text-lg font-semibold text-blue-600 capitalize">
                {restaurant.plan}
              </p>
            </div>
            
          </CardContent>
        </Card>

        <div className="pt-4">
          <Button type="submit" className="w-full" disabled={isSaving}>
            {isSaving ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </div>
      </form>

      {/* Modals */}
      <OpeningHoursEditor
        isOpen={isHoursDialogOpen}
        onClose={() => setIsHoursDialogOpen(false)}
        initialSchedule={formData.opening_hours || {}}
        onSave={handleHoursSave}
      />
      
      <SocialNetworksDialog
        isOpen={isSocialDialogOpen}
        onClose={() => setIsSocialDialogOpen(false)}
        initialLinks={formData.social_networks || []}
        onSave={handleSocialSave}
      />
    </div>
  );
};

export default ProfileSettingsPage;