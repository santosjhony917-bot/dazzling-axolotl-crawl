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
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { useRestaurantProfile } from '@/hooks/useRestaurantProfile';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom'; // Importa useNavigate
import { createPageUrl } from '@/utils/url'; // Importa createPageUrl

export default function RestaurantProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { restaurant, loading, error, updateRestaurant, refetch } = useRestaurantProfile(user?.id);
  
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [description, setDescription] = useState(restaurant?.description || '');
  const [isSavingDescription, setIsSavingDescription] = useState(false);

  useEffect(() => {
    if (restaurant) {
      setDescription(restaurant.description || '');
    }
  }, [restaurant]);

  const handleSaveDescription = useCallback(async () => {
    if (!restaurant || description === restaurant.description) return;
    
    setIsSavingDescription(true);
    const { error } = await updateRestaurant({ description });
    
    if (!error) {
      toast.success("Descrição atualizada!");
    }
    setIsSavingDescription(false);
  }, [description, restaurant, updateRestaurant]);

  if (loading) {
    return (
      <div className="p-4 max-w-md mx-auto space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="p-4 text-center text-red-500">
        <p>Erro ao carregar perfil: {error}</p>
        <p>Certifique-se de que seu restaurante está cadastrado e vinculado à sua conta.</p>
        <Button onClick={() => navigate(createPageUrl('restaurant-signup'))} className="mt-4">
          Cadastrar Restaurante
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7f8] pb-20 max-w-md mx-auto p-4 space-y-6">
      
      {/* Header Principal (Logo e Status) */}
      <ProfileHeaderManagement
        restaurantName={restaurant.name}
        logoUrl={restaurant.image_url}
        isPremium={restaurant.plan === 'premium'}
        uploading={uploadingLogo || uploadingCover}
        handleFileSelect={async (file, type) => {
          // Esta lógica será implementada no ProfileHeaderManagement
          // Aqui apenas passamos o estado de upload
        }}
      />

      {/* Descrição do Restaurante */}
      <Card className="shadow-md border-none rounded-xl p-4">
        <CardHeader className="p-0 mb-4">
          <CardTitle className="text-xl font-bold text-[#022D68]">Sobre o Restaurante</CardTitle>
          <CardDescription>Uma breve descrição que aparecerá no seu perfil público.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 space-y-3">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Conte aos clientes sobre seu restaurante, sua culinária e seu diferencial."
            rows={4}
            className="rounded-xl text-base focus:border-highlight focus:ring-highlight"
            disabled={isSavingDescription}
          />
          <Button
            onClick={handleSaveDescription}
            disabled={isSavingDescription || description === restaurant.description}
            className="w-full h-10 bg-highlight hover:bg-highlight/90 text-white rounded-xl text-sm font-bold"
          >
            {isSavingDescription ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              "Salvar Descrição"
            )}
          </Button>
        </CardContent>
      </Card>
      
      {/* Outras seções de perfil virão aqui */}
      
    </div>
  );
}