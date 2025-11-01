"use client";

import React from 'react';
import { useAuthData } from '@/context/AuthContext';
import { Profile } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Phone, User as UserIcon } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client'; // Importando supabase

interface ClientBasicInfoSectionProps {
  profile: Profile | null;
  isLoading: boolean;
}

const ClientBasicInfoSection: React.FC<ClientBasicInfoSectionProps> = ({ profile, isLoading }) => {
  const { user, refetchProfile } = useAuthData();
  const queryClient = useQueryClient();

  // Placeholder for avatar upload logic
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !event.target.files || event.target.files.length === 0) {
      return;
    }
    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error uploading avatar:', uploadError);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    if (publicUrlData?.publicUrl) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrlData.publicUrl })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating avatar URL:', updateError);
      } else {
        await refetchProfile(); // Refetch para atualizar o contexto
        queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informações do Cliente</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-4">
          <div className="relative">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover border-2 border-[#E47948]"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-2 border-[#E47948]">
                <UserIcon className="h-12 w-12 text-gray-500" />
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
              title="Mudar avatar"
            />
          </div>
          <div>
            <p className="text-xl font-semibold text-[#022D68]">
              {profile?.first_name || 'Usuário'} {profile?.last_name || ''}
            </p>
            <p className="text-sm text-gray-500">
              {user?.email}
            </p>
          </div>
        </div>
        <div className="space-y-2">
          {profile?.phone && (
            <div className="flex items-center text-gray-700">
              <Phone className="h-4 w-4 mr-2" /> {profile.phone}
            </div>
          )}
          {user?.email && (
            <div className="flex items-center text-gray-700">
              <Mail className="h-4 w-4 mr-2" /> {user.email}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ClientBasicInfoSection;