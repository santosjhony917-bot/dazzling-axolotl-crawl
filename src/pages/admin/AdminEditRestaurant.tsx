"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getPublicRestaurantById,
  updateRestaurant,
  addRestaurant,
} from '@/integrations/supabase/restaurants';
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
import { RestaurantPlan } from '@/types/supabase';
import { AdminRestaurant, WeekSchedule, SocialNetworkLink, GalleryImage } from '@/types/restaurant'; // Importando tipos atualizados
import { DEFAULT_SCHEDULE } from '@/constants/schedule';
import ScheduleEditorDialog from '@/components/restaurant/ScheduleEditorDialog';
import SocialNetworksDialog from '@/components/restaurant/SocialNetworksDialog';
import PaymentMethodsDialog from '@/components/restaurant/PaymentMethodsDialog';
import { createPageUrl } from '@/utils/url';
import { supabase } from '@/integrations/supabase/client';

const AdminEditRestaurant: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<AdminRestaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isScheduleEditorOpen, setIsScheduleEditorOpen] = useState(false);
  const [isSocialNetworksDialogOpen, setIsSocialNetworksDialogOpen] = useState(false);
  const [isPaymentMethodsDialogOpen, setIsPaymentMethodsDialogOpen] = useState(false);
  const isNewRestaurant = id === 'new';

  useEffect(() => {
    const fetchRestaurant = async () => {
      if (!isNewRestaurant && id) {
        setLoading(true);
        const fetchedRestaurant = await getPublicRestaurantById(id);
        if (fetchedRestaurant) {
          setRestaurant(fetchedRestaurant);
        } else {
          showError('Restaurante não encontrado.');
          navigate('/admin/restaurants');
        }
        setLoading(false);
      } else {
        setRestaurant({
          id: '', // Será gerado pelo Supabase
          user_id: '', // Deve ser preenchido ao criar
          name: '',
          description: '',
          image_url: '',
          cover_image_url: '',
          plan: 'free',
          phone: '',
          email: '',
          cnpj: '',
          category: '',
          whatsapp_url: '',
          ifood_url: '',
          other_url: '',
          other_url_label: '',
          address: '',
          number: '',
          neighborhood: '',
          city: '',
          state: '',
          cep: '',
          latitude: null,
          longitude: null,
          opening_hours: DEFAULT_SCHEDULE,
          created_at: '',
          external_url: '',
          followers_override: 0,
          payment_methods: [],
          social_networks: [],
          menu_categories: [],
          gallery_images: [],
        });
        setLoading(false);
      }
    };

    fetchRestaurant();
  }, [id, isNewRestaurant, navigate]);

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

  const handleSelectChange = (field: keyof AdminRestaurant, value: string) => {
    setRestaurant((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        [field]: value,
      };
    });
  };

  const handleNumberChange = (field: keyof AdminRestaurant, value: string) => {
    setRestaurant((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        [field]: value === '' ? null : Number(value),
      };
    });
  };

  const handlePlanChange = async (newPlan: RestaurantPlan | 'premium_gift') => {
    if (!restaurant) return;
    setIsSaving(true);
    const { error: updateError } = await updateRestaurant(restaurant.id, { plan: newPlan });
    if (updateError) {
      showError(`Erro ao atualizar plano: ${updateError.message}`);
    } else {
      setRestaurant((prev) => (prev ? { ...prev, plan: newPlan } : null));
      showSuccess('Plano atualizado com sucesso!');
    }
    setIsSaving(false);
  };

  const handleSave = async () => {
    if (!restaurant) return;

    setIsSaving(true);
    try {
      const restaurantDataToSave: Omit<AdminRestaurant, 'id' | 'created_at'> = {
        user_id: restaurant.user_id,
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
        opening_hours: restaurant.opening_hours,
        external_url: restaurant.external_url,
        followers_override: restaurant.followers_override,
        payment_methods: restaurant.payment_methods,
        social_networks: restaurant.social_networks,
      };

      if (isNewRestaurant) {
        // Para um novo restaurante, precisamos de um user_id.
        // Por simplicidade, vamos usar o user.id do admin logado,
        // mas em um cenário real, você teria um seletor de usuário ou um fluxo de criação diferente.
        const { data: authUser } = await supabase.auth.getUser();
        if (!authUser.user) {
          throw new Error('Nenhum usuário autenticado para criar o restaurante.');
        }
        restaurantDataToSave.user_id = authUser.user.id;

        const { data, error } = await addRestaurant(restaurantDataToSave);
        if (error) throw new Error(error.message);
        showSuccess('Restaurante criado com sucesso!');
        navigate(`/admin/restaurants/${data.id}`);
      } else {
        const { error } = await updateRestaurant(restaurant.id, restaurantDataToSave);
        if (error) throw new Error(error.message);
        showSuccess('Restaurante atualizado com sucesso!');
      }
    } catch (err: any) {
      console.error('Failed to save restaurant:', err);
      showError(`Erro ao salvar restaurante: ${err.message}`);
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

  const handleAddGalleryImage = () => {
    setRestaurant((prev) => {
      if (!prev) return null;
      const newImage: GalleryImage = {
        id: `temp-${Date.now()}`, // ID temporário para o frontend
        restaurant_id: prev.id,
        image_url: '',
        caption: '',
        order_index: (prev.gallery_images?.length || 0) + 1,
        created_at: new Date().toISOString(),
      };
      return {
        ...prev,
        gallery_images: [...(prev.gallery_images || []), newImage],
      };
    });
  };

  const handleUpdateGalleryImage = (index: number, field: keyof GalleryImage, value: string) => {
    setRestaurant((prev) => {
      if (!prev || !prev.gallery_images) return null;
      const updatedImages = [...prev.gallery_images];
      updatedImages[index] = { ...updatedImages[index], [field]: value };
      return { ...prev, gallery_images: updatedImages };
    });
  };

  const handleRemoveGalleryImage = (index: number) => {
    setRestaurant((prev) => {
      if (!prev || !prev.gallery_images) return null;
      const updatedImages = prev.gallery_images.filter((_, i) => i !== index);
      return { ...prev, gallery_images: updatedImages };
    });
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
        <h1 className="text-2xl font-bold mb-4">Erro ao carregar restaurante</h1>
        <Button onClick={() => navigate('/admin/restaurants')}>Voltar para a lista</Button>
      </div>
    );
  }

  const restaurantPublicUrl = restaurant.id ? createPageUrl(`/restaurant/${restaurant.id}`) : '#';

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-primary mb-6">
        {isNewRestaurant ? 'Criar Novo Restaurante' : `Editar Restaurante: ${restaurant.name}`}
      </h1>

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
            <div>
              <Label htmlFor="plan">Plano</Label>
              <Select
                value={restaurant.plan}
                onValueChange={(value: RestaurantPlan | 'premium_gift') => handlePlanChange(value)}
              >
                <SelectTrigger id="plan">
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
              <Label htmlFor="followers_override">Override de Seguidores (Admin)</Label>
              <Input
                id="followers_override"
                type="number"
                value={restaurant.followers_override || 0}
                onChange={(e) => handleNumberChange('followers_override', e.target.value)}
              />
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  value={restaurant.latitude || ''}
                  onChange={(e) => handleNumberChange('latitude', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  value={restaurant.longitude || ''}
                  onChange={(e) => handleNumberChange('longitude', e.target.value)}
                />
              </div>
            </div>
            <Button variant="outline" onClick={() => setIsScheduleEditorOpen(true)}>
              <PlusCircle className="h-4 w-4 mr-2" /> Editar Horário de Funcionamento
            </Button>
            <Button variant="outline" onClick={() => setIsPaymentMethodsDialogOpen(true)}>
              <PlusCircle className="h-4 w-4 mr-2" /> Gerenciar Formas de Pagamento
            </Button>
          </CardContent>
        </Card>

        {/* Galeria de Imagens */}
        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle>Galeria de Imagens</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {restaurant.gallery_images?.map((image, index) => (
              <div key={image.id} className="flex items-end gap-2">
                <div className="grid gap-2 flex-grow">
                  <Label htmlFor={`gallery-image-url-${index}`}>URL da Imagem</Label>
                  <Input
                    id={`gallery-image-url-${index}`}
                    value={image.image_url || ''}
                    onChange={(e) => handleUpdateGalleryImage(index, 'image_url', e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div className="grid gap-2 flex-grow-[2]">
                  <Label htmlFor={`gallery-caption-${index}`}>Legenda</Label>
                  <Input
                    id={`gallery-caption-${index}`}
                    value={image.caption || ''}
                    onChange={(e) => handleUpdateGalleryImage(index, 'caption', e.target.value)}
                    placeholder="Uma breve descrição da imagem"
                  />
                </div>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => handleRemoveGalleryImage(index)}
                  className="flex-shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" onClick={handleAddGalleryImage} className="mt-2">
              <PlusCircle className="h-4 w-4 mr-2" /> Adicionar Imagem à Galeria
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
        {!isNewRestaurant && (
          <Button variant="outline" onClick={() => window.open(restaurantPublicUrl, '_blank')}>
            Ver Perfil Público <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      <ScheduleEditorDialog
        isOpen={isScheduleEditorOpen}
        onClose={() => setIsScheduleEditorOpen(false)}
        initialSchedule={restaurant.opening_hours || DEFAULT_SCHEDULE}
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

export default AdminEditRestaurant;