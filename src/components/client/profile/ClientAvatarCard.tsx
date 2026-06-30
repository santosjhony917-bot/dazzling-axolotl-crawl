import React from 'react';
import { ImageUploadButton } from '@/components/ImageUploadButton';
import { Camera, User } from 'lucide-react';
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
    <section className="w-full rounded-[24px] border border-slate-100 bg-white p-5 shadow-soft">
      <div className="flex items-center gap-4">
        <div className="relative flex h-[76px] w-[76px] shrink-0 items-center justify-center overflow-visible rounded-full border border-highlight/15 bg-highlight/5 p-1">
          <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-white bg-white">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar do usuário" className="h-full w-full object-cover" />
            ) : (
              <User className="h-8 w-8 text-slate-300" />
            )}
          </div>

          <div className="absolute bottom-0 right-0 z-20 translate-x-1/10 translate-y-1/10">
            <ImageUploadButton
              imageUrl={avatarUrl || undefined}
              onUploadComplete={onAvatarUploadComplete}
              bucketName={USER_AVATAR_BUCKET}
              folderPath={userId || 'temp'}
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-highlight p-0 text-white shadow-sm transition-transform hover:bg-highlight/90 active:scale-95"
              icon={<Camera className="h-3.5 w-3.5" />}
              disabled={uploading}
            />
          </div>
        </div>

        <div className="min-w-0 flex-grow">
          <h3 className="truncate text-[20px] font-semibold leading-tight tracking-tight text-[#3C2F2F]">
            {fullName}
          </h3>
          <p className="mt-1.5 text-xs font-normal leading-relaxed text-text-secondary">
            Atualize sua foto quando quiser.
          </p>
        </div>
      </div>
    </section>
  );
};

export default ClientAvatarCard;
