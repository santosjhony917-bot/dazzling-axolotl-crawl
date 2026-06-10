"use client";

import React from 'react';
import { ImageUploadButton } from '@/components/ImageUploadButton';
import { Camera } from 'lucide-react';
import { DEFAULT_AVATAR_URL } from '@/constants/assets';
import { USER_AVATAR_BUCKET } from '@/integrations/supabase/storage';
import { cn } from '@/lib/utils';

interface UserAvatarDisplayProps {
  userId: string;
  avatarUrl: string | null | undefined;
  uploading: boolean;
  onAvatarUploadComplete: (url: string) => void;
}

const UserAvatarDisplay: React.FC<UserAvatarDisplayProps> = ({
  userId,
  avatarUrl,
  uploading,
  onAvatarUploadComplete,
}) => {
  return (
    <div className="relative w-24 h-24 rounded-full border-4 border-white bg-gray-200 dark:bg-gray-600 shrink-0 shadow-none overflow-visible">
      <img 
        src={avatarUrl || DEFAULT_AVATAR_URL} 
        alt="Avatar do Usuário" 
        className="w-full h-full object-cover rounded-full"
      />
      <div className="absolute bottom-0 right-0 z-50 translate-x-1/4 translate-y-1/4">
        <ImageUploadButton
          onUploadComplete={onAvatarUploadComplete}
          bucketName={USER_AVATAR_BUCKET}
          folderPath={userId || 'temp'}
          className="h-7 w-7 p-0 bg-highlight text-white hover:bg-highlight/90 rounded-full shadow-none"
          icon={<Camera className="h-3 w-3" />}
          disabled={uploading}
        />
      </div>
    </div>
  );
};

export default UserAvatarDisplay;