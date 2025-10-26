import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/context/AuthContext';
import { useGalleryManagement } from '@/hooks/useGalleryManagement';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Upload, Trash2, Image, PlusCircle, AlertTriangle, Camera, Crown } from 'lucide-react'; // Adicionado Crown
import { showSuccess, showError } from '@/utils/toast';
import { createPageUrl } from '@/utils/url';
import RestaurantAreaHeader from '@/components/restaurant/RestaurantAreaHeader';
import RestaurantBottomNav from '@/components/restaurant/RestaurantBottomNav';
import { useUserRole } from '@/hooks/useUserRole';
import GalleryImageCard from '@/components/restaurant/GalleryImageCard';
import { ImageUploadButton } from '@/components/ImageUploadButton';
import { RESTAURANT_IMAGES_BUCKET } from '@/integrations/supabase/storage';
import { useAuth } from '@/hooks/useAuth'; // Importando useAuth

export default function GalleryManagement() {
  const navigate = useNavigate();
  const { isLoading: authLoading } = useAuthContext();
  // CORREÇÃO: Usando useAuth para obter restaurant
  const { restaurant } = useAuth(); 
  const { isPremium } = useUserRole();
  const restaurantId = restaurant?.id || null;

  const { 
    gallery, 
    isLoading: galleryLoading, 
    addGalleryImage, 
    deleteGalleryImage, 
    updateGalleryImage,
    isAdding, 
    isRemoving
  } = useGalleryManagement(restaurantId);

  const [newCaption, setNewCaption] = useState('');

  const handleUploadComplete = useCallback(async (url: string) => {
    if (!restaurantId) {
      showError("ID do restaurante não encontrado.");
      return;
    }
    try {
      await addGalleryImage({ 
        image_url: url, 
        caption: newCaption || null,
        restaurant_id: restaurantId,
      });
      setNewCaption('');
      // showSuccess("Foto adicionada à galeria!"); // Toast handled by ImageUploadButton
    } catch (error) {
      showError("Falha ao adicionar imagem.");
    }
  }, [restaurantId, newCaption, addGalleryImage]);

  const handleDeleteImage = useCallback(async (imageId: string) => {
    if (window.confirm("Tem certeza que deseja deletar esta imagem?")) {
      try {
        await deleteGalleryImage(imageId);
        showSuccess("Foto removida da galeria.");
      } catch (error) {
        showError("Falha ao remover imagem.");
      }
    }
  }, [deleteGalleryImage]);

  const handleUpdateCaption = useCallback(async (imageId: string, newCaption: string) => {
    try {
      await updateGalleryImage({ imageId, updates: { caption: newCaption } }); 
      showSuccess("Legenda atualizada.");
    } catch (error) {
      showError("Falha ao atualizar legenda.");
    }
  }, [updateGalleryImage]);

  if (authLoading || galleryLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-[#f5f7f8]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Acesso Negado</h2>
        <p className="text-gray-600 mb-6">Você precisa ser um usuário de restaurante para gerenciar a galeria.</p>
        <Button onClick={() => navigate(createPageUrl('index'))}>
          Voltar para o Início
        </Button>
      </div>
    );
  }
  
  // Verifica se o recurso é Premium e se o usuário não é Premium
  if (!isPremium) {
    return (
      <div className="min-h-screen bg-[#f5f7f8] pb-20 max-w-md mx-auto">
        <RestaurantAreaHeader title="Galeria de Fotos" icon={Camera} backPath="restaurant-area/profile-menu" />
        <main className="p-4 space-y-6">
          <Card className="p-6 text-center border-2 border-amber-500 bg-amber-50">
            <Crown className="w-12 h-12 text-amber-600 mx-auto mb-4 fill-amber-100" />
            <h2 className="text-xl font-bold text-amber-800 mb-2">Recurso Premium</h2>
            <p className="text-amber-700 mb-6">O gerenciamento da galeria de fotos é exclusivo para planos Premium. Faça upgrade para desbloquear este recurso e atrair mais clientes.</p>
            <Button onClick={() => navigate(createPageUrl('restaurant-area/upgrade'))} className="bg-amber-600 hover:bg-amber-700">
              Fazer Upgrade Agora
            </Button>
          </Card>
        </main>
        <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md z-30">
          <RestaurantBottomNav selectedTab="gallery" isFree={!isPremium} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7f8] pb-20 max-w-md mx-auto">
      <RestaurantAreaHeader title="Galeria de Fotos" icon={Camera} backPath="restaurant-area/profile-menu" />
      
      <main className="p-4 space-y-6">
        <p className="text-gray-600">Adicione, edite ou remova fotos que aparecerão no perfil público do seu restaurante.</p>

        {/* Adicionar Nova Imagem */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-primary">
              <PlusCircle className="w-5 h-5" /> Adicionar Nova Foto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label htmlFor="caption" className="block text-sm font-medium text-gray-700 mb-1">Legenda (Opcional)</label>
                <Input
                  id="caption"
                  type="text"
                  placeholder="Uma breve descrição da foto"
                  value={newCaption}
                  onChange={(e) => setNewCaption(e.target.value)}
                  disabled={isAdding}
                />
              </div>
              <ImageUploadButton
                onUploadComplete={handleUploadComplete}
                bucketName={RESTAURANT_IMAGES_BUCKET}
                folderPath={`${restaurantId}/gallery`}
                className="w-full h-10"
              >
                {isAdding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                {isAdding ? "Enviando..." : "Selecionar e Enviar Foto"}
              </ImageUploadButton>
            </div>
          </CardContent>
        </Card>

        {/* Galeria Atual */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-primary">
              <Image className="w-5 h-5" /> Fotos Atuais ({gallery.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {gallery.length === 0 ? (
              <p className="text-gray-500">Nenhuma foto na galeria ainda.</p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {gallery.map((image) => (
                  <div key={image.id} className="relative">
                    <GalleryImageCard 
                      image={image} 
                      onDelete={handleDeleteImage} 
                      isDeleting={isRemoving}
                    />
                    <Input
                      type="text"
                      placeholder="Adicionar legenda"
                      defaultValue={image.caption || ''}
                      onBlur={(e) => handleUpdateCaption(image.id, e.target.value)}
                      disabled={isRemoving}
                      className="mt-2 h-8 text-sm"
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      
      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md z-30">
        <RestaurantBottomNav selectedTab="gallery" isFree={!isPremium} />
      </div>
    </div>
  );
}