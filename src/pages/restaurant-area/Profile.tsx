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
import { useAuth } from '@/hooks/useAuth'; // Importação corrigida
import toast from 'react-hot-toast';

export default function RestaurantProfilePage() {
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Restaurant>>({});

  const fetchRestaurant = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = No rows found
      console.error('Error fetching restaurant:', error);
      toast.error('Erro ao carregar dados do restaurante.');
    } else if (data) {
      setRestaurant(data);
      setFormData(data);
    } else {
      // Handle case where restaurant doesn't exist yet (e.g., new user)
      setRestaurant(null);
      setFormData({});
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchRestaurant();
  }, [fetchRestaurant]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleUpdate = useCallback(async (updates: Partial<Restaurant>): Promise<void> => { // Tipo de retorno ajustado para void
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
      return; // Retorna void
    }

    if (data) {
      setRestaurant(data);
      setFormData(data);
      toast.success('Informações atualizadas com sucesso!');
      return; // Retorna void
    }
    return; // Retorna void
  }, [restaurant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant?.id) {
      toast.error("Restaurante não carregado.");
      return;
    }
    await handleUpdate(formData);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full p-8">
        <Loader2 className="h-8 w-8 animate-spin text-[#E47948]" />
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