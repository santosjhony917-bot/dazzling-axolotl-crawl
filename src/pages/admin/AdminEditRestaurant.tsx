import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/use-toast';
import { Loader2, ArrowLeft } from 'lucide-react';
import SalesChannelsDialog from '@/components/restaurant/SalesChannelsDialog';
import { RestaurantGalleryItem, AdminRestaurant, WeekSchedule, SocialNetworkLink } from '@/types/restaurant'; // Corrigido para RestaurantGalleryItem, AdminRestaurant, WeekSchedule, SocialNetworkLink
import { createPageUrl } from '@/utils/url';
import SocialNetworksDialog from '@/components/restaurant/SocialNetworksDialog';
import OpeningHoursDialog from '@/components/restaurant/OpeningHoursDialog';
import { DEFAULT_SCHEDULE } from '@/constants/schedule';

const AdminEditRestaurant: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<Partial<AdminRestaurant>>({});
  const [isSalesChannelsDialogOpen, setIsSalesChannelsDialogOpen] = useState(false);
  const [isSocialNetworksDialogOpen, setIsSocialNetworksDialogOpen] = useState(false);
  const [isOpeningHoursDialogOpen, setIsOpeningHoursDialogOpen] = useState(false);

  const { data: restaurant, isLoading, error } = useQuery<AdminRestaurant, Error>({
    queryKey: ['adminRestaurant', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('restaurants')
        .select(`*, restaurant_gallery(*), menu_categories(*), user_favorites(*)`)
        .eq('id', id)
        .single();
      if (error) throw error;
      return {
        ...data,
        restaurant_gallery: data.restaurant_gallery || [],
        menu_categories: data.menu_categories || [],
        user_favorites: data.user_favorites || [],
        social_networks: data.social_networks as SocialNetworkLink[] || [],
        opening_hours: data.opening_hours as WeekSchedule || DEFAULT_SCHEDULE,
      };
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (restaurant) {
      setFormData({
        name: restaurant.name,
        description: restaurant.description,
        image_url: restaurant.image_url,
        cover_image_url: restaurant.cover_image_url,
        plan: restaurant.plan,
        phone: restaurant.phone,
        email: restaurant.email,
        cnpj: restaurant.cnpj,
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
        followers_override: restaurant.followers_override,
        payment_methods: restaurant.payment_methods,
        social_networks: restaurant.social_networks,
        opening_hours: restaurant.opening_hours,
      });
    }
  }, [restaurant]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'number') {
      setFormData((prev) => ({ ...prev, [name]: parseFloat(value) }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const updateRestaurantMutation = useMutation({
    mutationFn: async (updates: Partial<AdminRestaurant>) => {
      const { data, error } = await supabase
        .from('restaurants')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['adminRestaurant', id]);
      toast({
        title: "Sucesso",
        description: "Restaurante atualizado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Falha ao atualizar restaurante: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateRestaurantMutation.mutate(formData);
  };

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
    return <div className="text-center text-red-500">Erro ao carregar restaurante: {error.message}</div>;
  }

  if (!restaurant) {
    return <div className="text-center text-gray-500">Restaurante não encontrado.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <Button variant="outline" onClick={() => navigate('/admin/restaurants')} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Restaurantes
      </Button>
      <h1 className="text-3xl font-bold mb-6">Editar Restaurante: {restaurant.name}</h1>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Informações Básicas */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Informações Básicas</h2>
          <div>
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" value={formData.name || ''} onChange={handleChange} />
          </div>
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" name="description" value={formData.description || ''} onChange={handleChange} />
          </div>
          <div>
            <Label htmlFor="category">Categoria</Label>
            <Input id="category" name="category" value={formData.category || ''} onChange={handleChange} />
          </div>
          <div>
            <Label htmlFor="plan">Plano</Label>
            <Select name="plan" value={formData.plan || 'free'} onValueChange={(value) => handleSelectChange('plan', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o plano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="premium_gift">Premium Gift</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="image_url">URL da Imagem (Logo)</Label>
            <Input id="image_url" name="image_url" value={formData.image_url || ''} onChange={handleChange} />
          </div>
          <div>
            <Label htmlFor="cover_image_url">URL da Imagem de Capa</Label>
            <Input id="cover_image_url" name="cover_image_url" value={formData.cover_image_url || ''} onChange={handleChange} />
          </div>
          <div>
            <Label htmlFor="followers_override">Seguidores (Override)</Label>
            <Input id="followers_override" name="followers_override" type="number" value={formData.followers_override || 0} onChange={handleChange} />
          </div>
        </div>

        {/* Contato e Canais */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Contato e Canais</h2>
          <div>
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" name="phone" value={formData.phone || ''} onChange={handleChange} />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" value={formData.email || ''} onChange={handleChange} />
          </div>
          <div>
            <Label htmlFor="cnpj">CNPJ</Label>
            <Input id="cnpj" name="cnpj" value={formData.cnpj || ''} onChange={handleChange} />
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={() => setIsSalesChannelsDialogOpen(true)}>Gerenciar Canais de Venda</Button>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={() => setIsSocialNetworksDialogOpen(true)}>Gerenciar Redes Sociais</Button>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={() => setIsOpeningHoursDialogOpen(true)}>Gerenciar Horário de Funcionamento</Button>
          </div>
        </div>

        {/* Endereço */}
        <div className="space-y-4 md:col-span-2">
          <h2 className="text-2xl font-semibold">Endereço</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="address">Endereço</Label>
              <Input id="address" name="address" value={formData.address || ''} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="number">Número</Label>
              <Input id="number" name="number" value={formData.number || ''} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="neighborhood">Bairro</Label>
              <Input id="neighborhood" name="neighborhood" value={formData.neighborhood || ''} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="city">Cidade</Label>
              <Input id="city" name="city" value={formData.city || ''} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="state">Estado</Label>
              <Input id="state" name="state" value={formData.state || ''} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="cep">CEP</Label>
              <Input id="cep" name="cep" value={formData.cep || ''} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="latitude">Latitude</Label>
              <Input id="latitude" name="latitude" type="number" value={formData.latitude || ''} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="longitude">Longitude</Label>
              <Input id="longitude" name="longitude" type="number" value={formData.longitude || ''} onChange={handleChange} />
            </div>
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={updateRestaurantMutation.isPending} className="mt-6 w-full">
        {updateRestaurantMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
      </Button>

      <SalesChannelsDialog
        isOpen={isSalesChannelsDialogOpen}
        onClose={() => setIsSalesChannelsDialogOpen(false)}
        restaurantId={restaurant.id}
        initialWhatsappUrl={restaurant.whatsapp_url || ''}
        initialIfoodUrl={restaurant.ifood_url || ''}
        initialOtherUrl={restaurant.other_url || ''}
        initialOtherUrlLabel={restaurant.other_url_label || ''}
      />

      <SocialNetworksDialog
        isOpen={isSocialNetworksDialogOpen}
        onClose={() => setIsSocialNetworksDialogOpen(false)}
        restaurantId={restaurant.id}
        initialSocialNetworks={socialNetworks}
      />

      <OpeningHoursDialog
        isOpen={isOpeningHoursDialogOpen}
        onClose={() => setIsOpeningHoursDialogOpen(false)}
        restaurantId={restaurant.id}
        initialOpeningHours={openingHours}
      />
    </div>
  );
};

export default AdminEditRestaurant;