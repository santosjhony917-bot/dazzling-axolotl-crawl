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
    <Card className="w-full grubgo-card p-6 shadow-soft border border-slate-100/80 bg-white rounded-[24px]">
      <div className="flex items-center gap-5">
        {/* Avatar Circular com Anel Gradiente */}
        <div className="relative w-[88px] h-[88px] rounded-full p-[3px] bg-gradient-to-br from-[#FF7E40] to-[#EF2A39] shrink-0 shadow-[0_6px_20px_rgba(239,42,57,0.22)] flex items-center justify-center overflow-visible">
          <div className="w-full h-full rounded-full overflow-hidden bg-white border border-white flex items-center justify-center">
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt="Avatar do Usuário" 
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-10 h-10 text-slate-350" />
            )}
          </div>
          
          {/* Botão de Upload Flutuante */}
          <div className="absolute bottom-0 right-0 z-20 translate-x-1/10 translate-y-1/10">
            <ImageUploadButton
              imageUrl={avatarUrl || undefined}
              onUploadComplete={onAvatarUploadComplete}
              bucketName={USER_AVATAR_BUCKET}
              folderPath={userId || 'temp'}
              className="h-8 w-8 p-0 bg-[#EF2A39] hover:bg-[#EF2A39]/90 text-white rounded-full shadow-[0_4px_10px_rgba(239,42,57,0.3)] border-2 border-white flex items-center justify-center transition-transform active:scale-90"
              icon={<Camera className="h-3.5 w-3.5" />}
            />
          </div>
        </div>
        
        {/* Nome e Instrução */}
        <div className="flex-grow min-w-0">
          <h3 className="font-extrabold text-xl text-slate-800 leading-tight truncate">{fullName}</h3>
          <p className="text-xs text-slate-400 font-bold mt-1.5 leading-normal">
            Toque no ícone da câmera para alterar sua foto de perfil.
          </p>
        </div>
      </div>
    </Card>
  );
};

export default ClientAvatarCard;