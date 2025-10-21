import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import ProfileHeaderManagement from '@/components/restaurant/profile/ProfileHeaderManagement';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useImageUpload } from '@/hooks/useImageUpload'; // Importa o hook de upload

// Tipagem básica para o restaurante
interface Restaurant {
  id: string;
  user_id: string;
  name: string;
  description: string;
  logo_url: string | null;
  cover_image_url: string | null;
  plan: 'free' | 'premium';
}

const BUCKET_NAME = 'restaurant_assets';

const ProfilePage: React.FC = () => {
  const { isPremium, isLoading } = useUserRole();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loadingRestaurant, setLoadingRestaurant] = useState(true);
  const { uploadImage, uploading } = useImageUpload(); // Usa o hook de upload

  // Mock user ID for testing until full auth is implemented
  const mockUserId = '00000000-0000-0000-0000-000000000001'; 
  const restaurantId = '00000000-0000-0000-0000-000000000001'; // Assuming 1:1 relationship for now

  // 1. Fetch Restaurant Data (Mocked or Real)
  useEffect(() => {
    const fetchRestaurant = async () => {
      setLoadingRestaurant(true);
      // In a real scenario, we would fetch the restaurant associated with the logged-in user
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, user_id, name, description, image_url, plan, logo_url, cover_image_url')
        .eq('id', restaurantId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means 'no rows found'
        console.error('Error fetching restaurant:', error);
        toast.error('Erro ao carregar dados do restaurante.');
      } else if (data) {
        setRestaurant({
          ...data,
          logo_url: data.logo_url,
          cover_image_url: data.cover_image_url,
          plan: data.plan as 'free' | 'premium',
        });
      } else {
        // Mock data if not found (for development)
        setRestaurant({
          id: restaurantId,
          user_id: mockUserId,
          name: 'Restaurante Exemplo',
          description: 'Descrição do restaurante.',
          logo_url: null,
          cover_image_url: null,
          plan: isPremium ? 'premium' : 'free',
        });
      }
      setLoadingRestaurant(false);
    };

    fetchRestaurant();
  }, [isPremium]);

  // 2. Handle File Upload Logic
  const handleFileSelect = async (file: File, type: 'logo' | 'cover') => {
    if (!restaurant) return;

    try {
      // Usa o hook useImageUpload para fazer o upload
      const { url, error: uploadError } = await uploadImage(file, BUCKET_NAME, restaurant.id, type);

      if (uploadError) {
        throw uploadError;
      }

      // Update restaurant record in the database
      const updateColumn = type === 'logo' ? 'logo_url' : 'cover_image_url';
      const { error: updateError } = await supabase
        .from('restaurants')
        .update({ [updateColumn]: url, updated_at: new Date().toISOString() })
        .eq('id', restaurant.id);

      if (updateError) {
        throw updateError;
      }

      // Update local state
      setRestaurant(prev => prev ? { ...prev, [updateColumn]: url } : null);
      toast.success(`${type === 'logo' ? 'Logo' : 'Capa'} atualizada com sucesso!`);

    } catch (error) {
      console.error('Upload failed:', error);
      toast.error(`Falha ao enviar ${type === 'logo' ? 'logo' : 'capa'}.`);
    }
    // O estado 'uploading' é gerenciado internamente pelo hook useImageUpload
  };

  if (isLoading || loadingRestaurant || !restaurant) {
    return <div className="p-4 text-center">Carregando perfil...</div>;
  }

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-6">
      <ProfileHeaderManagement
        restaurantName={restaurant.name}
        logoUrl={restaurant.logo_url}
        coverImageUrl={restaurant.cover_image_url}
        isPremium={isPremium}
        uploading={uploading}
        handleFileSelect={handleFileSelect}
        restaurantId={restaurant.id}
      />

      <Card>
        <CardHeader>
          <CardTitle>Informações Básicas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Nome do Restaurante" value={restaurant.name} disabled />
          <Textarea placeholder="Descrição" value={restaurant.description || ''} disabled />
          <Button disabled>Salvar Alterações</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePage;