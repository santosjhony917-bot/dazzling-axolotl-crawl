import React, { useState, useCallback } from 'react';
import { Restaurant } from '@/types/restaurant';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, Upload, Loader2 } from 'lucide-react';
import { ImageUploadButton } from '@/components/ImageUploadButton';
import { uploadFile, RESTAURANT_IMAGES_BUCKET } from '@/integrations/supabase/storage';
import toast from 'react-hot-toast';

// Definindo o tipo de retorno esperado para onUpdate
type UpdateFunction = (updates: Partial<Restaurant>) => Promise<{ error: string | null }>;

interface ProfileHeaderManagementProps {
  restaurant: Restaurant;
  onUpdate: UpdateFunction;
}

// Helper para adicionar cache-busting
const getCacheBustedUrl = (url: string | null | undefined) => {
  if (!url) return null;
  // Adiciona um timestamp para forçar o recarregamento
  return `${url}?t=${Date.now()}`;
};

export default function ProfileHeaderManagement({ restaurant, onUpdate }: ProfileHeaderManagementProps) {
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = useCallback(async (file: File, type: 'logo' | 'cover') => {
    if (!restaurant.id) {
      toast.error("ID do restaurante não encontrado.");
      return;
    }

    setUploading(true);
    
    // Usamos um nome de arquivo fixo (logo ou cover) para garantir que o upsert funcione
    // e sempre substitua o arquivo anterior, independentemente da extensão.
    // O Supabase Storage lida com o tipo MIME.
    const path = `${restaurant.id}/${type}`; 

    const publicUrl = await uploadFile(file, RESTAURANT_IMAGES_BUCKET, path);

    setUploading(false);

    if (publicUrl) {
      const updateKey = type === 'logo' ? 'image_url' : 'cover_image_url';
      
      // Adicionamos um timestamp ao URL salvo no DB para garantir que o React recarregue a imagem
      const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`;
      
      const { error } = await onUpdate({ [updateKey]: cacheBustedUrl });
      
      if (error) {
        toast.error(`Imagem enviada, mas falha ao salvar URL: ${error}`);
      } else {
        toast.success("Imagem atualizada com sucesso!");
      }
    } else {
      toast.error("Falha ao fazer upload da imagem. Verifique o nome do bucket e as permissões.");
    }
  }, [restaurant.id, onUpdate]);

  // O getCacheBustedUrl agora é usado apenas para exibição, pois o timestamp já está no URL do DB
  const logoUrl = restaurant.image_url;
  const coverImageUrl = restaurant.cover_image_url;

  return (
    <Card className="relative overflow-hidden shadow-lg">
      {/* Cover Image */}
      <div className="h-48 bg-gray-200 relative">
        {coverImageUrl ? (
          <img
            src={coverImageUrl}
            alt="Capa do Restaurante"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            Adicionar Imagem de Capa
          </div>
        )}
        <ImageUploadButton
          onFileSelect={(file) => handleFileSelect(file, 'cover')}
          uploading={uploading}
          className="absolute top-4 right-4 h-8 w-8 p-0 bg-black/50 text-white hover:bg-black/70"
          icon={<Upload className="h-4 w-4" />}
        />
      </div>

      <CardContent className="p-6 pt-0">
        {/* Logo/Avatar */}
        <div className="relative -mt-12 mb-4 w-24 h-24 rounded-full border-4 border-white bg-gray-300 shadow-md">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo do Restaurante"
              className="w-full h-full object-cover rounded-full"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-600 rounded-full">
              <Pencil className="h-6 w-6" />
            </div>
          )}
          <ImageUploadButton
            onFileSelect={(file) => handleFileSelect(file, 'logo')}
            uploading={uploading}
            className="absolute bottom-0 right-0 h-6 w-6 p-0 bg-[#E47948] text-white hover:bg-[#E47948]/90"
            icon={uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          />
        </div>

        {/* Restaurant Info */}
        <h1 className="text-3xl font-bold text-gray-800">{restaurant.name}</h1>
        <p className="text-sm text-gray-500 mt-1">{restaurant.address}</p>

        {/* Actions/Status */}
        <div className="mt-4 flex items-center space-x-4">
          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${restaurant.plan === 'premium' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'}`}>
            Plano: {restaurant.plan.charAt(0).toUpperCase() + restaurant.plan.slice(1)}
          </span>
          <Button variant="outline" size="sm">
            <Pencil className="mr-2 h-4 w-4" /> Editar Informações
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}