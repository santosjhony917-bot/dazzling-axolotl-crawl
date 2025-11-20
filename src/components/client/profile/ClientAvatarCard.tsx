import React from 'react';
import { Card } from '@/components/ui/card';
import { ImageUploadButton } from '@/components/ImageUploadButton';
import { Camera, User } from 'lucide-react';
import { DEFAULT_AVATAR_URL } from "@/constants/assets";
import { USER_AVATAR_BUCKET } from '@/integrations/supabase/storage';

interface ClientAvatarCardProps {
  firstName: string;
  lastName: string;
  avatarUrl: string | null | undefined;
  uploading: boolean;
  onAvatarUploadComplete: (url: string) => void;
  userId: string;
}

const ClientAvatarCard: React.FC<ClientAvatarCardProps> = ({
  firstName,
  lastName,
  avatarUrl,
  uploading,
  onAvatarUploadComplete,
  userId,
}) => {
  const fullName = `${firstName || 'Usuário'} ${lastName || 'Anônimo'}`;
  
  return (
    <Card className="w-full shadow-soft-xl border-none rounded-2xl p-6 bg-white dark:bg-gray-800">
      <div className="flex items-start gap-4">
        {/* Avatar Circular */}
        <div className="relative w-24 h-24 rounded-full border-4 border-white bg-gray-200 dark:bg-gray-600 shrink-0 shadow-lg overflow-visible flex items-center justify-center">
          {avatarUrl ? (
            <img 
              src={avatarUrl} 
              alt="Avatar do Usuário" 
              className="w-full h-full object-cover rounded-full"
            />
          ) : (
            <User className="w-12 h-12 text-gray-500" />
          )}
          
          {/* Aumentando o z-index para z-20 */}
          <div className="absolute bottom-0 right-0 z-20 translate-x-1/4 translate-y-1/4">
            <ImageUploadButton
              imageUrl={avatarUrl || undefined}
              onUploadComplete={onAvatarUploadComplete}
              bucketName={USER_AVATAR_BUCKET}
              folderPath={userId || 'temp'}
              className="h-7 w-7 p-0 bg-[#E47948] text-white hover:bg-[#E47948]/90 rounded-full shadow-md"
              icon={<Camera className="h-3 w-3" />}
            />
          </div>
        </div>
        
        {/* Nome e Instrução */}
        <div className="flex-1 pt-2">
          <h3 className="font-bold text-2xl text-[#022D68] leading-tight truncate">{fullName}</h3>
          <p className="text-sm text-gray-500 mt-2">Clique no ícone para alterar sua foto de perfil.</p>
        </div>
      </div>
    </Card>
  );
};

export default ClientAvatarCard;