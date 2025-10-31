import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchOwnerRestaurantData, updateRestaurantProfile } from '@/integrations/supabase/restaurants';
import { Restaurant } from '@/types/restaurant';
import { WeekSchedule } from '@/types/schedule';
import { convertOpeningHoursToWeekSchedule } from '@/lib/schedule';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, Save, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import ScheduleEditor from '@/components/restaurant/ScheduleEditor';
import ImageUpload from '@/components/restaurant/ImageUpload';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RESTAURANT_CATEGORIES } from '@/constants/categories';
import { cn } from '@/lib/utils';

interface FormState {
  name: string;
  description: string;
  category: string;
  phone: string;
  email: string;
  whatsapp_url: string;
  ifood_url: string;
  other_url: string;
  address: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
  external_url: string;
  image_url: string | null;
  cover_image_url: string | null;
  opening_hours: WeekSchedule; // Usando WeekSchedule
}

const defaultSchedule: WeekSchedule = {
  monday: { isOpen: false, slots: [] },
  tuesday: { isOpen: false, slots: [] },
  wednesday: { isOpen: false, slots: [] },
  thursday: { isOpen: false, slots: [] },
  friday: { isOpen: false, slots: [] },
  saturday: { isOpen: false, slots: [] },
  sunday: { isOpen: false, slots: [] },
};

const ProfileSettingsPage: React.FC = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // NOTE: Since this page is protected by ProtectedRoute, we should rely on useAuthData for restaurantId
  // For now, we keep the useParams logic but ensure restaurantId is available.
  const currentRestaurantId = restaurantId || 'temp'; 

  const { data: restaurant, isLoading } = useQuery<Restaurant | null>({
    queryKey: ['ownerRestaurantProfile', currentRestaurantId],
    queryFn: () => fetchOwnerRestaurantData(currentRestaurantId),
    enabled: !!currentRestaurantId,
  });

  const [formState, setFormState] = useState<FormState>({
    name: '',
    description: '',
    category: '',
    phone: '',
    email: '',
    whatsapp_url: '',
    ifood_url: '',
    other_url: '',
    address: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
    cep: '',
    external_url: '',
    image_url: null,
    cover_image_url: null,
    opening_hours: defaultSchedule,
  });

  useEffect(() => {
    if (restaurant) {
      const currentSchedule = restaurant.opening_hours 
        ? convertOpeningHoursToWeekSchedule(restaurant.opening_hours) 
        : defaultSchedule;
        
      setFormState({
        name: restaurant.name || '',
        description: restaurant.description || '',
        category: restaurant.category || '',
        phone: restaurant.phone || '',
        email: restaurant.email || '',
        whatsapp_url: restaurant.whatsapp_url || '',
        ifood_url: restaurant.ifood_url || '',
        other_url: restaurant.other_url || '',
        address: restaurant.address || '',
        number: restaurant.number || '',
        neighborhood: restaurant.neighborhood || '',
        city: restaurant.city || '',
        state: restaurant.state || '',
        cep: restaurant.cep || '',
        external_url: restaurant.external_url || '',
        image_url: restaurant.image_url,
        cover_image_url: restaurant.cover_image_url,
        opening_hours: currentSchedule,
      });
    }
  }, [restaurant]);

  const mutation = useMutation({
    mutationFn: (data: Partial<Restaurant>) => updateRestaurantProfile(currentRestaurantId, data),
    onSuccess: () => {
      toast.success('Perfil atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['ownerRestaurantProfile', currentRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['restaurantProfile', currentRestaurantId] });
    },
    onError: (error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormState(prev => ({ ...prev, [id]: value }));
  };

  const handleScheduleChange = (newSchedule: WeekSchedule) => {
    setFormState(prev => ({ ...prev, opening_hours: newSchedule }));
  };

  const handleImageChange = (field: 'image_url' | 'cover_image_url', url: string | null) => {
    setFormState(prev => ({ ...prev, [field]: url }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convert WeekSchedule back to OpeningHours[] (DB format)
    const openingHoursArray = Object.entries(formState.opening_hours)
      .flatMap(([dayName, schedule], index) => {
        if (!schedule.isOpen || schedule.slots.length === 0) {
          return [];
        }
        // Day index: Sunday=0, Monday=1, ..., Saturday=6
        const dayIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(dayName);
        
        return schedule.slots.map(slot => ({
          day: dayIndex,
          open: slot.start,
          close: slot.end,
        }));
      });

    const dataToUpdate: Partial<Restaurant> = {
      name: formState.name,
      description: formState.description,
      category: formState.category,
      phone: formState.phone,
      email: formState.email,
      whatsapp_url: formState.whatsapp_url,
      ifood_url: formState.ifood_url,
      other_url: formState.other_url,
      address: formState.address,
      number: formState.number,
      neighborhood: formState.neighborhood,
      city: formState.city,
      state: formState.state,
      cep: formState.cep,
      external_url: formState.external_url,
      image_url: formState.image_url,
      cover_image_url: formState.cover_image_url,
      opening_hours: openingHoursArray as Restaurant['opening_hours'],
    };

    mutation.mutate(dataToUpdate);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!restaurant) {
    return <div className="p-4 text-center">Restaurante não encontrado.</div>;
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-primary">Configurações do Perfil</h1>
        <Button variant="outline" onClick={() => navigate(`/owner/dashboard/${currentRestaurantId}`)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Dashboard
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Gerais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome do Restaurante</Label>
              <Input id="name" value={formState.name} onChange={handleChange} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" value={formState.description} onChange={handleChange} rows={4} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Categoria</Label>
              <Select value={formState.category} onValueChange={(value) => setFormState(prev => ({ ...prev, category: value }))}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {RESTAURANT_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Imagens */}
        <Card>
          <CardHeader>
            <CardTitle>Imagens</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ImageUpload
              label="Logo (Imagem de Perfil)"
              currentUrl={formState.image_url}
              onUploadComplete={(url) => handleImageChange('image_url', url)}
              onRemove={() => handleImageChange('image_url', null)}
              folder={`restaurants/${currentRestaurantId}/logo`}
              aspectRatio={1/1}
            />
            <Separator />
            <ImageUpload
              label="Imagem de Capa (Banner)"
              currentUrl={formState.cover_image_url}
              onUploadComplete={(url) => handleImageChange('cover_image_url', url)}
              onRemove={() => handleImageChange('cover_image_url', null)}
              folder={`restaurants/${currentRestaurantId}/cover`}
              aspectRatio={16/9}
            />
          </CardContent>
        </Card>

        {/* Contato e Links */}
        <Card>
          <CardHeader>
            <CardTitle>Contato e Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" value={formState.phone} onChange={handleChange} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={formState.email} onChange={handleChange} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="whatsapp_url">Link WhatsApp (Completo)</Label>
              <Input id="whatsapp_url" value={formState.whatsapp_url} onChange={handleChange} placeholder="Ex: https://wa.me/5511999999999" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ifood_url">Link iFood</Label>
              <Input id="ifood_url" value={formState.ifood_url} onChange={handleChange} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="external_url">Link Site/Outro</Label>
              <Input id="external_url" value={formState.external_url} onChange={handleChange} />
            </div>
          </CardContent>
        </Card>

        {/* Endereço */}
        <Card>
          <CardHeader>
            <CardTitle>Endereço</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="cep">CEP</Label>
              <Input id="cep" value={formState.cep} onChange={handleChange} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Rua/Avenida</Label>
              <Input id="address" value={formState.address} onChange={handleChange} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="number">Número</Label>
                <Input id="number" value={formState.number} onChange={handleChange} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input id="neighborhood" value={formState.neighborhood} onChange={handleChange} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="city">Cidade</Label>
                <Input id="city" value={formState.city} onChange={handleChange} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="state">Estado (UF)</Label>
                <Input id="state" value={formState.state} onChange={handleChange} maxLength={2} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Horário de Funcionamento */}
        <Card>
          <CardHeader>
            <CardTitle>Horário de Funcionamento</CardTitle>
          </CardHeader>
          <CardContent>
            <ScheduleEditor 
              schedule={formState.opening_hours}
              onChange={handleScheduleChange}
            />
          </CardContent>
        </Card>

        <Button type="submit" className="w-full h-12 text-lg" disabled={mutation.isPending}>
          {mutation.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Save className="h-5 w-5 mr-2" /> Salvar Alterações
            </>
          )}
        </Button>
      </form>
    </div>
  );
};

export default ProfileSettingsPage;