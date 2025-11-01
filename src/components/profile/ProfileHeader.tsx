import React from 'react';
import { ImageUploadButton } from '@/components/ImageUploadButton';
import { Camera } from 'lucide-react';
import { DEFAULT_USER_AVATAR_URL } from '@/constants/assets';
import { USER_AVATARS_BUCKET } from '@/integrations/supabase/storage';

// Definindo o tipo Profile baseado no schema do Supabase
interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  phone: string | null;
}

interface ProfileHeaderProps {
  profile: Profile;
  onAvatarUploadComplete: (url: string) => void;
  uploading: boolean;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ profile, onAvatarUploadComplete, uploading }) => {
  const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();

  return (
    <div className="flex flex-col items-center p-6 bg-white rounded-lg shadow-md">
      {/* Avatar Container: overflow-visible para permitir que o botão flutuante apareça, z-index alto */}
      <div className="relative w-32 h-32 mb-4 rounded-full border-4 border-white bg-gray-200 shrink-0 shadow-lg overflow-visible">
        <img 
          src={profile.avatar_url || DEFAULT_USER_AVATAR_URL} 
          alt={fullName || "User Avatar"} 
          className="w-full h-full object-cover rounded-full" // Garantindo que a imagem interna seja circular
        />
        
        {/* Upload Button */}
        <div className="absolute bottom-0 right-0 z-50 translate-x-1/4 translate-y-1/4">
          <ImageUploadButton
            onUploadComplete={onAvatarUploadComplete}
            bucketName={USER_AVATARS_BUCKET}
            folderPath={profile.id}
            className="h-8 w-8 p-0 bg-blue-600 text-white hover:bg-blue-700 rounded-full shadow-md"
            icon={<Camera className="h-4 w-4" />}
            disabled={uploading}
          />
        </div>
      </div>
      
      <h1 className="text-2xl font-bold text-gray-800">{fullName || "Usuário"}</h1>
      <p className="text-sm text-gray-500 mt-1">{profile.phone || 'Telefone não cadastrado'}</p>
    </div>
  );
};

export default ProfileHeader;