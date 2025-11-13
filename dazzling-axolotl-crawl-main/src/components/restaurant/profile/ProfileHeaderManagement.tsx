import React, { useState, useCallback, memo } from 'react';
import { Restaurant } from '@/types/supabase'; // CORRIGIDO: Importando Restaurant de supabase.ts
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, Upload, Loader2, Eye, Camera } from 'lucide-react';
import { ImageUploadButton } from '@/components/ImageUploadButton';
import { uploadFile, RESTAURANT_IMAGES_BUCKET } from '@/integrations/supabase/storage';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';
import { DEFAULT_RESTAURANT_LOGO_URL } from "@/constants/assets";
import { cn } from '@/lib/utils';

// Definindo o tipo de retorno esperado para onUpdate
type UpdateFunction = (updates: Partial<Restaurant>) => Promise<{ error: string | null }>;

interface ProfileHeaderManagementProps {
  restaurant: Restaurant;
  onUpdate: UpdateFunction;
  // Adicionando prop para controlar o estado de upload
  uploadingLogo: boolean;
  setUploadingLogo: (state: boolean) => void;
  uploadingCover: boolean;
  setUploadingCover: (state: boolean) => void;
}

const ProfileHeaderManagement: React.FC<ProfileHeaderManagementProps> = memo(({ 
  restaurant, 
  onUpdate, 
  uploadingLogo, 
  setUploadingLogo, 
  uploadingCover, 
  setUploadingCover 
}) => {
  const navigate = useNavigate();

  // Função auxiliar para salvar a URL no DB após o upload
  const handleUrlUpdate = useCallback(async (url: string, type: 'logo' | 'cover') => {
    const isLogo = type === 'logo';
    const updateKey = isLogo ? 'image_url' : 'cover_image_url';
    
    // Adiciona um timestamp para garantir que o React/Browser recarregue a imagem (cache busting)
    const cacheBustedUrl = `${url}?t=${Date.now()}`;
    
    const { error } = await onUpdate({ [updateKey]: cacheBustedUrl });
    
    if (error) {
      toast.error(`Imagem enviada, mas falha ao salvar URL no DB: ${error}`);
    } else {
      toast.success("Imagem atualizada com sucesso!");
    }
    
    isLogo ? setUploadingLogo(false) : setUploadingCover(false);
  }, [onUpdate, setUploadingLogo, setUploadingCover]);


  const logoUrl = restaurant.image_url;
  const coverImageUrl = restaurant.cover_image_url;

  return (
    <div className="relative flex-shrink-0">
      {/* Cover Image Area (Hidden in this design, but kept for upload functionality) */}
      <div className="h-48 bg-gray-200 relative hidden">
        {coverImageUrl && (
          <img
            src={coverImageUrl}
            alt="Capa do Restaurante"
            className="w-full h-full object-cover"
          />
        )}
        {/* Botão de upload de capa (será movido para o topo do menu) */}
        <ImageUploadButton
          imageUrl={coverImageUrl || undefined}
          onUploadComplete={(url) => handleUrlUpdate(url, 'cover')}
          bucketName={RESTAURANT_IMAGES_BUCKET}
          folderPath={restaurant.id || 'temp'}
          className="absolute top-4 right-4 h-8 w-8 p-0 bg-black/50 text-white hover:bg-black/70"
          icon={<Upload className="h-4 w-4" />}
        />
      </div>

      {/* Logo Upload Container */}
      <div className="relative w-24 h-24 rounded-full border-4 border-white bg-gray-300 shadow-md overflow-visible"> {/* Alterado overflow-hidden para overflow-visible */}
        {/* Imagem de Preview (Renderizada Apenas Uma Vez) */}
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
        
        {/* Botão de Upload (Flutuante no canto) */}
        <div className="absolute bottom-0 right-0 z-10 translate-x-1/4 translate-y-1/4"> {/* Adicionado translate para mover para fora */}
          <ImageUploadButton
            imageUrl={logoUrl || undefined}
            onUploadComplete={(url) => handleUrlUpdate(url, 'logo')}
            bucketName={RESTAURANT_IMAGES_BUCKET}
            folderPath={restaurant.id || 'temp'}
            className="h-6 w-6 p-0 bg-[#E47948] text-white hover:bg-[#E47948]/90 rounded-full"
            icon={<Camera className="h-3 w-3" />}
          />
        </div>
      </div>
    </div>
  );
});

export default ProfileHeaderManagement;