"use client";

import React, { useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuthData } from '@/context/AuthContext';

interface ProfileHeaderManagementProps {
  restaurant: {
    id: string;
    cover_image_url?: string | null;
    image_url?: string | null;
    name: string;
  };
}

const ProfileHeaderManagement: React.FC<ProfileHeaderManagementProps> = ({ restaurant }) => {
  const { session, user, refetchRestaurant } = useAuthData();
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    type: 'cover' | 'logo'
  ) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }

    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${user?.id}/${restaurant.id}/${type}/${fileName}`;

    if (type === 'cover') setIsUploadingCover(true);
    else setIsUploadingLogo(true);

    const { error: uploadError } = await supabase.storage
      .from('restaurant_images')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      toast.error('Erro ao fazer upload da imagem.');
      if (type === 'cover') setIsUploadingCover(false);
      else setIsUploadingLogo(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from('restaurant_images')
      .getPublicUrl(filePath);

    if (!publicUrlData?.publicUrl) {
      toast.error('Erro ao obter URL pública da imagem.');
      if (type === 'cover') setIsUploadingCover(false);
      else setIsUploadingLogo(false);
      return;
    }

    const updateField = type === 'cover' ? 'cover_image_url' : 'image_url';
    const { error: updateError } = await supabase
      .from('restaurants')
      .update({ [updateField]: publicUrlData.publicUrl })
      .eq('id', restaurant.id);

    if (updateError) {
      console.error('Error updating restaurant image URL:', updateError);
      toast.error('Erro ao atualizar a URL da imagem.');
    } else {
      toast.success('Imagem atualizada com sucesso!');
      refetchRestaurant(); // Refresh restaurant data in context
    }

    if (type === 'cover') setIsUploadingCover(false);
    else setIsUploadingLogo(false);
  };

  return (
    <div className="relative w-full h-48 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
      {restaurant.cover_image_url ? (
        <img
          src={restaurant.cover_image_url}
          alt="Capa do Restaurante"
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
          Sem imagem de capa
        </div>
      )}
      <label
        htmlFor="cover-upload"
        className="absolute top-2 right-2 bg-white dark:bg-gray-800 p-2 rounded-full shadow-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        {isUploadingCover ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : (
          <Camera className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        )}
        <input
          id="cover-upload"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleImageUpload(e, 'cover')}
          disabled={isUploadingCover}
        />
      </label>

      <div className="absolute -bottom-12 left-4 w-24 h-24 bg-gray-300 dark:bg-gray-600 rounded-full border-4 border-white dark:border-gray-900 flex items-center justify-center overflow-hidden shadow-lg">
        {restaurant.image_url ? (
          <img
            src={restaurant.image_url}
            alt="Logo do Restaurante"
            className="w-full h-full object-cover"
          />
        ) : (
          <Utensils className="h-12 w-12 text-gray-500 dark:text-gray-400" />
        )}
        <label
          htmlFor="logo-upload"
          className="absolute bottom-0 right-0 bg-white dark:bg-gray-800 p-1 rounded-full shadow-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          {isUploadingLogo ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <Camera className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          )}
          <input
            id="logo-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleImageUpload(e, 'logo')}
            disabled={isUploadingLogo}
          />
        </label>
      </div>
    </div>
  );
};

export default ProfileHeaderManagement;