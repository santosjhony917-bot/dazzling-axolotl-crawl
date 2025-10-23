import React, { useState, useCallback, memo } from 'react';
import { Restaurant } from '@/types/restaurant';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, Upload, Loader2, Eye, Camera } from 'lucide-react';
import { ImageUploadButton } from '@/components/ImageUploadButton';
import { uploadFile, RESTAURANT_IMAGES_BUCKET } from '@/integrations/supabase/storage';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';
import { DEFAULT_RESTAURANT_LOGO_URL } from "@/constants/assets";

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

  const handleFileSelect = useCallback(async (file: File, type: 'logo' | 'cover') => {
    if (!restaurant.id) {
      toast.error("ID do restaurante não encontrado.");
      return;
    }

    const isLogo = type === 'logo';
    isLogo ? setUploadingLogo(true) : setUploadingCover(true);
    
    const path = `${restaurant.id}/${type}`; 
    let publicUrl: string | null = null;

    try {
      publicUrl = await uploadFile(file, RESTAURANT_IMAGES_BUCKET, path);

      if (publicUrl) {
        const updateKey = isLogo ? 'image_url' : 'cover_image_url';
        
        // Adiciona um timestamp para garantir que o React/Browser recarregue a imagem (cache busting)
        const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`;
        
        const { error } = await onUpdate({ [updateKey]: cacheBustedUrl });
        
        if (error) {
          toast.error(`Imagem enviada, mas falha ao salvar URL no DB: ${error}`);
        } else {
          toast.success("Imagem atualizada com sucesso!");
        }
      } else {
        toast.error("Falha ao fazer upload da imagem. Verifique o console para detalhes.");
      }
    } catch (e) {
      const errorMessage = (e as Error).message || "Erro desconhecido durante o upload.";
      toast.error(errorMessage);
    } finally {
      isLogo ? setUploadingLogo(false) : setUploadingCover(false);
    }
  }, [restaurant.id, onUpdate, setUploadingLogo, setUploadingCover]);

  const logoUrl = restaurant.image_url;
  const coverImageUrl = restaurant.cover_image_url;

  return (
    <div className="relative w-full">
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
          onFileSelect={(file) => handleFileSelect(file, 'cover')}
          uploading={uploadingCover}
          className="absolute top-4 right-4 h-8 w-8 p-0 bg-black/50 text-white hover:bg-black/70"
          icon={<Upload className="h-4 w-4" />}
        />
      </div>

      {/* Logo Upload Button (Used inside the main card in the parent component) */}
      <div className="relative w-24 h-24 rounded-full border-4 border-white bg-gray-300 shadow-md">
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
          uploading={uploadingLogo}
          className="absolute bottom-0 right-0 h-6 w-6 p-0 bg-[#E47948] text-white hover:bg-[#E47948]/90"
          icon={<Camera className="h-3 w-3" />}
        />
      </div>
    </div>
  );
});

export default ProfileHeaderManagement;