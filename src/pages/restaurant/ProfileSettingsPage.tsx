"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Restaurant } from '@/types/restaurant'; // Importando Restaurant
import { PublicRestaurantData, SocialNetworkLink } from '@/types/restaurant'; // Importando SocialNetworkLink
import { getRestaurantOpenStatus } from '@/lib/schedule';
import { getPublicRestaurantById, updateRestaurant } from '@/integrations/supabase/restaurants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, PlusCircle, Trash2, ExternalLink } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { WeekSchedule } from '@/types/schedule'; // Importando WeekSchedule
import ScheduleEditorDialog from '@/components/restaurant/ScheduleEditorDialog';
import SocialNetworksDialog from '@/components/restaurant/SocialNetworksDialog';
import PaymentMethodsDialog from '@/components/restaurant/PaymentMethodsDialog';
import { createPageUrl } from '@/utils/url';

const ProfileSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isScheduleEditorOpen, setIsScheduleEditorOpen] = useState(false);
  const [isSocialNetworksDialogOpen, setIsSocialNetworksDialogOpen] = useState(false);
  const [isPaymentMethodsDialogOpen, setIsPaymentMethodsDialogOpen] = useState(false);

  useEffect(() => {
    const fetchRestaurant = async () => {
      if (user?.id) {
        setLoading(true);
        // Assumindo que o user_id do restaurante é o mesmo do auth.uid()
        // Em um cenário real, você buscaria o restaurante associado ao user_id
        const { data, error } = await supabase
          .from('restaurants')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
          console.error('Error fetching restaurant:', error);
          showError('Erro ao carregar dados do restaurante.');
          setLoading(false);
          return;
        }

        if (data) {
          setRestaurant(data as Restaurant);
        }
        setLoading(false);
      }
    };

    fetchRestaurant();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value, type, checked } = e.target as HTMLInputElement;
    setRestaurant((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        [id]: type === 'checkbox' ? checked : value,
      };
    });
  };

  const handleSelectChange = (id: keyof Restaurant, value: string) => {
    setRestaurant((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        [id]: value,
      };
    });
  };

  const handleSave = async () => {
    if (!restaurant || !user?.id) return;

    setIsSaving(true);
    try {
      const updates: Partial<Restaurant> = {
        name: restaurant.name,
        description: restaurant.description,
        phone: restaurant.phone,
        email: restaurant.email,
        category: restaurant.category,
        whatsapp_url: restaurant.whatsapp_url,
        ifood_url: restaurant.ifood_url,
        other_url: restaurant.other_url,
        other_url_label: restaurant.other_url_label,
        address: restaurant.address,
        number: restaurant.number,
        neighborhood: restaurant.neighborhood,
        city: restaurant.city,
        state: restaurant.state,
        cep: restaurant.cep,
        latitude: restaurant.latitude,
        longitude: restaurant.longitude,
        image_url: restaurant.image_url,
        cover_image_url: restaurant.cover_image_url,
        external_url: restaurant.external_url,
        opening_hours: restaurant.opening_hours,
        payment_methods: restaurant.payment_methods,
        social_networks: restaurant.social_networks,
      };

      const { error } = await updateRestaurant(restaurant.id, updates);

      if (error) {
        throw new Error(error.message);
      }

      showSuccess('Configurações do perfil salvas com sucesso!');
    } catch (err: any) {
      console.error('Failed to save profile settings:', err);
      showError(`Erro ao salvar configurações: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSchedule = (newSchedule: WeekSchedule) => {
    setRestaurant((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        opening_hours: newSchedule,
      };
    });
    setIsScheduleEditorOpen(false);
  };

  const handleSaveSocialNetworks = (updatedSocialNetworks: SocialNetworkLink[]) => {
    setRestaurant((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        social_networks: updatedSocialNetworks,
      };
    });
    setIsSocialNetworksDialogOpen(false);
  };

  const handleSavePaymentMethods = (updatedPaymentMethods: string[]) => {
    setRestaurant((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        payment_methods: updatedPaymentMethods,
      };
    });
    setIsPaymentMethodsDialogOpen(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="container mx-auto p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Nenhum restaurante encontrado</h1>
        <p className="mb-4">Parece que você ainda não tem um restaurante cadastrado.</p>
        <Button onClick={() => navigate('/restaurant/create')}>Criar Meu Restaurante</Button>
      </div>
    );
  }

  const restaurantPublicUrl = createPageUrl(`/restaurant/${restaurant.id}`);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-primary mb-6">Configurações do Perfil</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Nome do Restaurante</Label>
              <Input id="name" value={restaurant.name || ''} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" value={restaurant.description || ''} onChange={handleChange} rows={4} />
            </div>
            <div>
              <Label htmlFor="category">Categoria</Label>
              <Input id="category" value={restaurant.category || ''} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="image_url">URL da Imagem de Perfil</Label>
              <Input id="image_url" value={restaurant.image_url || ''} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="cover_image_url">URL da Imagem de Capa</Label>
              <Input id="cover_image_url" value={restaurant.cover_image_url || ''} onChange={handleChange} />
            </div>
          </CardContent>
        </Card>

        {/* Contato e Links */}
        <Card>
          <CardHeader>
            <CardTitle>Contato e Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" value={restaurant.phone || ''} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={restaurant.email || ''} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="whatsapp_url">Link WhatsApp</Label>
              <Input id="whatsapp_url" value={restaurant.whatsapp_url || ''} onChange={handleChange} placeholder="https://wa.me/..." />
            </div>
            <div>
              <Label htmlFor="ifood_url">Link iFood</Label>
              <Input id="ifood_url" value={restaurant.ifood_url || ''} onChange={handleChange} placeholder="https://www.ifood.com.br/..." />
            </div>
            <div>
              <Label htmlFor="other_url">Outro Link</Label>
              <Input id="other_url" value={restaurant.other_url || ''} onChange={handleChange} placeholder="https://..." />
            </div>
            <div>
              <Label htmlFor="other_url_label">Rótulo do Outro Link</Label>
              <Input id="other_url_label" value={restaurant.other_url_label || ''} onChange={handleChange} placeholder="Ex: Nosso Site" />
            </div>
            <div>
              <Label htmlFor="external_url">URL Externa (para redirecionamento)</Label>
              <Input id="external_url" value={restaurant.external_url || ''} onChange={handleChange} placeholder="https://seusite.com" />
            </div>
            <Button variant="outline" onClick={() => setIsSocialNetworksDialogOpen(true)}>
              <PlusCircle className="h-4 w-4 mr-2" /> Gerenciar Redes Sociais
            </Button>
          </CardContent>
        </Card>

        {/* Endereço e Horário */}
        <Card>
          <CardHeader>
            <CardTitle>Endereço e Horário</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="address">Endereço</Label>
              <Input id="address" value={restaurant.address || ''} onChange={handleChange} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="number">Número</Label>
                <Input id="number" value={restaurant.number || ''} onChange={handleChange} />
              </div>
              <div>
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input id="neighborhood" value={restaurant.neighborhood || ''} onChange={handleChange} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">Cidade</Label>
                <Input id="city" value={restaurant.city || ''} onChange={handleChange} />
              </div>
              <div>
                <Label htmlFor="state">Estado</Label>
                <Input id="state" value={restaurant.state || ''} onChange={handleChange} />
              </div>
            </div>
            <div>
              <Label htmlFor="cep">CEP</Label>
              <Input id="cep" value={restaurant.cep || ''} onChange={handleChange} />
            </div>
            <Button variant="outline" onClick={() => setIsScheduleEditorOpen(true)}>
              <PlusCircle className="h-4 w-4 mr-2" /> Editar Horário de Funcionamento
            </Button>
            <Button variant="outline" onClick={() => setIsPaymentMethodsDialogOpen(true)}>
              <PlusCircle className="h-4 w-4 mr-2" /> Gerenciar Formas de Pagamento
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 flex justify-between items-center">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" /> Salvar Alterações
            </>
          )}
        </Button>
        <Button variant="outline" onClick={() => window.open(restaurantPublicUrl, '_blank')}>
          Ver Perfil Público <ExternalLink className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <ScheduleEditorDialog
        isOpen={isScheduleEditorOpen}
        onClose={() => setIsScheduleEditorOpen(false)}
        initialSchedule={restaurant.opening_hours || {}}
        onSave={handleSaveSchedule}
      />

      <SocialNetworksDialog
        isOpen={isSocialNetworksDialogOpen}
        onClose={() => setIsSocialNetworksDialogOpen(false)}
        restaurant={restaurant}
        onSaveSuccess={handleSaveSocialNetworks}
      />

      <PaymentMethodsDialog
        isOpen={isPaymentMethodsDialogOpen}
        onClose={() => setIsPaymentMethodsDialogOpen(false)}
        restaurant={restaurant}
        onSaveSuccess={handleSavePaymentMethods}
      />
    </div>
  );
};

export default ProfileSettingsPage;