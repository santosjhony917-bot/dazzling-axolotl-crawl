import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Image, Plus, Loader2, Trash2, Camera, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import RestaurantAreaPageLayout from '@/components/restaurant/RestaurantAreaPageLayout';
import { useAuthContext } from '@/context/AuthContext';
import { usePublicGallery, useCreateGalleryImage, useDeleteGalleryImage, PublicGalleryImage } from '@/hooks/usePublicGallery';
import { showSuccess, showError } from '@/utils/toast';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

const GalleryManagement: React.FC = () => {
  const navigate = useNavigate();
  // Propriedades corrigidas no useAuthContext
  const { restaurant, isLoading: authLoading, isPremium } = useAuthContext(); 
  const restaurantId = restaurant?.id || null;

  const { gallery, isLoading: galleryLoading, refetch } = usePublicGallery(restaurantId);
  const createMutation = useCreateGalleryImage();
  const deleteMutation = useDeleteGalleryImage();

  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');

  const isLoading = authLoading || galleryLoading || createMutation.isPending || deleteMutation.isPending || isUploading;

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!restaurantId || !restaurant) {
    return <p className="text-red-500 p-8">Erro: Restaurante não encontrado ou não autorizado.</p>;
  }

  if (!isPremium) {
    return (
      <RestaurantAreaPageLayout title="Galeria de Fotos" backPath={`/restaurant-area/${restaurantId}/dashboard`} restaurant={restaurant}>
        <Card className="p-6 text-center shadow-soft-md bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
          <Camera className="w-8 h-8 text-yellow-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-yellow-800 dark:text-yellow-300">Recurso Premium</h3>
          <p className="text-yellow-700 text-sm mt-1 dark:text-yellow-400">A Galeria de Fotos está disponível apenas para planos Premium.</p>
          <Button 
            onClick={() => navigate(`/restaurant-area/${restaurantId}/upgrade`)}
            className="mt-4 bg-yellow-600 hover:bg-yellow-700 text-white"
          >
            Fazer Upgrade
          </Button>
        </Card>
      </RestaurantAreaPageLayout>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    } else {
      setFile(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !restaurantId) return;

    setIsUploading(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `${restaurantId}/${fileName}`;

      // 1. Upload to Storage
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('gallery')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: publicUrlData } = supabase.storage
        .from('gallery')
        .getPublicUrl(filePath);
        
      if (!publicUrlData.publicUrl) throw new Error("Failed to get public URL.");

      // 3. Insert into Database
      const nextOrderIndex = gallery ? gallery.length : 0;
      await createMutation.mutateAsync({
        restaurant_id: restaurantId,
        image_url: publicUrlData.publicUrl,
        caption: caption,
        order_index: nextOrderIndex,
      });

      showSuccess('Imagem adicionada à galeria!');
      setFile(null);
      setCaption('');
      refetch();

    } catch (error) {
      showError('Falha ao fazer upload da imagem.');
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (imageId: string) => {
    if (!window.confirm('Tem certeza que deseja deletar esta imagem?')) return;
    try {
      await deleteMutation.mutateAsync(imageId);
      showSuccess('Imagem deletada com sucesso!');
      refetch();
    } catch (error) {
      showError('Falha ao deletar imagem.');
      console.error(error);
    }
  };

  return (
    <RestaurantAreaPageLayout title="Galeria de Fotos" backPath={`/restaurant-area/${restaurantId}/dashboard`} restaurant={restaurant}>
      <div className="p-4 space-y-6">
        
        {/* Formulário de Upload */}
        <Card className="shadow-soft-md dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="text-xl text-primary dark:text-highlight flex items-center">
              <Upload className="w-5 h-5 mr-2" /> Adicionar Nova Foto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="space-y-4">
              <Input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={isLoading}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <Textarea
                placeholder="Legenda (opcional)"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                disabled={isLoading}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <Button type="submit" disabled={isLoading || !file} className="w-full">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                {isUploading ? 'Enviando...' : 'Adicionar à Galeria'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Lista de Imagens */}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Galeria Atual ({gallery?.length || 0})</h2>
        
        {gallery && gallery.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {gallery.map((image) => (
              <div key={image.id} className="relative group overflow-hidden rounded-lg shadow-soft-md">
                <img 
                  src={image.image_url} 
                  alt={image.caption || 'Imagem da galeria'} 
                  className="w-full h-32 object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    onClick={() => handleDelete(image.id)}
                    disabled={isLoading}
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
                {image.caption && (
                  <p className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">
                    {image.caption}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 italic">Nenhuma imagem na galeria. Adicione uma acima!</p>
        )}
      </div>
    </RestaurantAreaPageLayout>
  );
};

export default GalleryManagement;