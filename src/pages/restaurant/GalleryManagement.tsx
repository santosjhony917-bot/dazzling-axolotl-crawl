import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Image, PlusCircle, Trash2, Upload, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createPageUrl } from '@/utils/url';
import { useRestaurantContext } from '@/context/RestaurantContext';
import { showError, showSuccess } from '@/utils/toast';
import RestaurantAreaPageLayout from '@/components/restaurant/RestaurantAreaPageLayout';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/lib/database.types';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type GalleryImage = Database['public']['Tables']['restaurant_gallery']['Row'];

export default function GalleryManagement() {
  const navigate = useNavigate();
  const { restaurant, isLoading: isRestaurantLoading } = useRestaurantContext();
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [isLoadingGallery, setIsLoadingGallery] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newImageCaption, setNewImageCaption] = useState('');
  const [newImageUrl, setNewImageUrl] = useState(''); // Mock URL upload

  const restaurantId = restaurant?.id;
  const isPremium = restaurant?.plan === 'premium';
  const maxImages = isPremium ? 20 : 5;
  const canUpload = gallery.length < maxImages;

  const fetchGallery = async () => {
    if (!restaurantId) return;
    setIsLoadingGallery(true);
    try {
      const { data, error } = await supabase
        .from('restaurant_gallery')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      setGallery(data || []);
    } catch (error) {
      console.error('Error fetching gallery:', error);
      showError('Falha ao carregar galeria.');
    } finally {
      setIsLoadingGallery(false);
    }
  };

  useEffect(() => {
    fetchGallery();
  }, [restaurantId]);

  const handleUploadImage = async () => {
    if (!newImageUrl.trim() || !restaurantId) return;

    try {
      const newOrderIndex = gallery.length > 0 ? gallery[gallery.length - 1].order_index + 1 : 0;

      const { error } = await supabase
        .from('restaurant_gallery')
        .insert({
          restaurant_id: restaurantId,
          image_url: newImageUrl.trim(),
          caption: newImageCaption.trim() || null,
          order_index: newOrderIndex,
        });

      if (error) throw error;

      showSuccess('Imagem adicionada com sucesso!');
      setNewImageUrl('');
      setNewImageCaption('');
      setIsDialogOpen(false);
      fetchGallery();
    } catch (error) {
      console.error('Error uploading image:', error);
      showError('Falha ao adicionar imagem.');
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!window.confirm('Tem certeza que deseja deletar esta imagem?')) return;

    try {
      const { error } = await supabase
        .from('restaurant_gallery')
        .delete()
        .eq('id', imageId);

      if (error) throw error;

      showSuccess('Imagem removida com sucesso.');
      fetchGallery();
    } catch (error) {
      console.error('Error deleting image:', error);
      showError('Falha ao remover imagem.');
    }
  };

  if (isRestaurantLoading || isLoadingGallery) {
    return (
      <RestaurantAreaPageLayout title="Galeria de Fotos" icon={Image} backPath="profileMenu">
        <div className="p-4 text-center text-gray-500">Carregando galeria...</div>
      </RestaurantAreaPageLayout>
    );
  }

  if (!restaurant) {
    return (
      <RestaurantAreaPageLayout title="Galeria de Fotos" icon={Image} backPath="profileMenu">
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-white">
          <Image className="w-12 h-12 text-red-500 mb-4" />
          <h1 className="text-xl font-bold text-red-600 mb-2">Acesso Negado</h1>
          <p className="text-gray-600 mb-6">Você precisa ser um usuário de restaurante para gerenciar a galeria.</p>
          <Button onClick={() => navigate(createPageUrl('index'))}>
            Voltar para o Início
          </Button>
        </div>
      </RestaurantAreaPageLayout>
    );
  }

  return (
    <RestaurantAreaPageLayout title="Galeria de Fotos" icon={Image} backPath="profileMenu">
      <div className="p-4 space-y-6">
        
        {/* Status Premium / Limite */}
        <Card className="shadow-soft-md border-none bg-white">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium text-gray-700">
                {isPremium ? 'Plano Premium' : 'Plano Gratuito'}
              </p>
              <p className="text-sm font-bold text-primary">
                {gallery.length} / {maxImages} Imagens
              </p>
            </div>
            {!isPremium && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center">
                  <Lock className="w-4 h-4 text-yellow-600 mr-2" />
                  <span className="text-sm text-yellow-800">Limite de 5 imagens. Faça upgrade para 20.</span>
                </div>
                <Button 
                  onClick={() => navigate(createPageUrl('restaurant-area/upgrade'))}
                  className="bg-highlight hover:bg-highlight/90 shrink-0 h-8 text-xs"
                >
                  Upgrade
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Botão de Upload */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="w-full h-12 bg-primary hover:bg-primary/90 shadow-soft-md"
              disabled={!canUpload}
            >
              <Upload className="w-5 h-5 mr-2" />
              {canUpload ? 'Fazer Upload de Imagem' : 'Limite Atingido'}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-xl">
            <DialogHeader>
              <DialogTitle>Adicionar Imagem</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="imageUrl">URL da Imagem (Mock)</Label>
                <Input
                  id="imageUrl"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="https://exemplo.com/foto.jpg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="caption">Legenda (Opcional)</Label>
                <Input
                  id="caption"
                  value={newImageCaption}
                  onChange={(e) => setNewImageCaption(e.target.value)}
                  placeholder="Uma breve descrição"
                />
              </div>
            </div>
            <Button onClick={handleUploadImage} disabled={!newImageUrl.trim()}>
              Adicionar à Galeria
            </Button>
          </DialogContent>
        </Dialog>

        <Separator />

        {/* Lista de Imagens */}
        <div className="grid grid-cols-2 gap-4">
          {gallery.map((image) => (
            <div key={image.id} className="relative group overflow-hidden rounded-xl shadow-soft-md">
              <img 
                src={image.image_url} 
                alt={image.caption || 'Imagem da galeria'} 
                className="w-full h-32 object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                <p className="text-white text-xs truncate">{image.caption}</p>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-2 right-2 h-8 w-8 text-white hover:bg-red-600/80"
                  onClick={() => handleDeleteImage(image.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        
        {gallery.length === 0 && (
          <p className="text-gray-500 text-center py-8">Nenhuma imagem na galeria ainda.</p>
        )}
      </div>
    </RestaurantAreaPageLayout>
  );
}