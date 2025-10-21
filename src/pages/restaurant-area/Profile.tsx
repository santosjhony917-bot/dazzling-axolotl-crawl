import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import ProfileHeaderManagement from '@/components/restaurant/profile/ProfileHeaderManagement';
import { Restaurant } from '@/types/restaurant';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import { useRestaurantProfile } from '@/hooks/useRestaurantProfile';
import { Skeleton } from '@/components/ui/skeleton';

export default function RestaurantProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const userId = user?.id || null;
  
  // Usando o hook atualizado para buscar pelo user ID
  const { restaurant, loading: restaurantLoading, updateRestaurant, refetch } = useRestaurantProfile(userId);
  
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Restaurant>>({});

  useEffect(() => {
    if (restaurant) {
      setFormData(restaurant);
    }
  }, [restaurant]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleUpdate = useCallback(async (updates: Partial<Restaurant>): Promise<void> => {
    if (!restaurant?.id) return;

    setIsSaving(true);
    const { data, error } = await supabase
      .from('restaurants')
      .update(updates)
      .eq('id', restaurant.id)
      .select()
      .single();

    setIsSaving(false);

    if (error) {
      console.error('Error updating restaurant:', error);
      toast.error('Erro ao salvar as alterações.');
      return;
    }

    if (data) {
      refetch(); // Usa refetch do hook para atualizar o estado global
      toast.success('Informações atualizadas com sucesso!');
      return;
    }
    return;
  }, [restaurant, refetch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant?.id) {
      toast.error("Restaurante não carregado.");
      return;
    }
    await handleUpdate(formData);
  };

  if (authLoading || restaurantLoading) {
    return (
      <div className="p-4 md:p-8 space-y-8 max-w-4xl mx-auto">
        <Skeleton className="h-40 w-full rounded-xl mb-6" />
        <Skeleton className="h-6 w-3/4 mb-4" />
        <Skeleton className="h-64 w-full rounded-xl mb-6" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold">Nenhum restaurante encontrado.</h2>
        <p className="text-gray-500">Por favor, crie um restaurante ou verifique sua conta.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800">Gerenciamento do Perfil</h1>

      {/* Header Management (Logo and Cover) */}
      <ProfileHeaderManagement
        restaurant={restaurant}
        onUpdate={handleUpdate}
      />

      {/* Basic Information Form */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Básicas</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Restaurante</Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={handleInputChange}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone || ''}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email de Contato</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ''}
                onChange={handleInputChange}
              />
            </div>
            <Button type="submit" disabled={isSaving} className="bg-[#E47948] hover:bg-[#E47948]/90">
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Address Information (Placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle>Endereço e Localização</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Funcionalidade de edição de endereço em desenvolvimento.</p>
        </CardContent>
      </Card>
    </div>
  );
}