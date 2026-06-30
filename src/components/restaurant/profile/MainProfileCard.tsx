import React from 'react';
import { ImageUploadButton } from '@/components/ImageUploadButton';
import { Camera, Crown } from 'lucide-react';
import { DEFAULT_RESTAURANT_LOGO_URL } from "@/constants/assets";
import { RESTAURANT_IMAGES_BUCKET } from '@/integrations/supabase/storage';
import { cn } from '@/lib/utils';

interface MainProfileCardProps {
  restaurantName: string;
  logoUrl: string | null | undefined;
  isPremium: boolean;
  uploading: boolean;
  onLogoUploadComplete: (url: string) => void;
  restaurantId: string;
}

const MainProfileCard: React.FC<MainProfileCardProps> = ({
  restaurantName,
  logoUrl,
  isPremium,
  uploading,
  onLogoUploadComplete,
  restaurantId,
}) => {
  return (
    <div
      className={cn(
        "w-full p-6 rounded-[24px] relative overflow-hidden",
        isPremium
          ? "shadow-[0_12px_40px_rgba(223,75,28,0.28)]"
          : "shadow-[0_8px_28px_rgba(223,75,28,0.14)]"
      )}
      style={{
        background: isPremium
          ? 'linear-gradient(135deg, #df4b1c 0%, #FF5C38 50%, #FF7E40 100%)'
          : 'linear-gradient(135deg, #FF7E40 0%, #df4b1c 100%)',
      }}
    >
      {/* Marca d'água decorativa */}
      <Crown className="absolute -right-5 -bottom-5 w-28 h-28 text-white/10 -rotate-12 pointer-events-none" />

      <div className="flex items-center gap-4 relative z-10">
        {/* Logo Circular com ring branco */}
        <div className="relative w-[72px] h-[72px] rounded-full shrink-0 overflow-visible ring-[3px] ring-white/60 shadow-[0_4px_16px_rgba(0,0,0,0.25)]">
          <img
            src={logoUrl || DEFAULT_RESTAURANT_LOGO_URL}
            alt="Logo do Restaurante"
            className="w-full h-full object-cover rounded-full"
          />
          {/* Botão de Upload flutuante */}
          <div className="absolute bottom-0 right-0 z-10 translate-x-1/4 translate-y-1/4">
            <ImageUploadButton
              onUploadComplete={onLogoUploadComplete}
              bucketName={RESTAURANT_IMAGES_BUCKET}
              folderPath={restaurantId || 'temp'}
              className="p-0 rounded-full h-7 w-7 bg-white text-[#df4b1c] shadow-md hover:brightness-110 transition-all border border-white/40"
              icon={<Camera className="h-3 w-3" />}
              disabled={uploading}
            />
          </div>
        </div>

        {/* Nome e badge */}
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-extrabold text-xl leading-tight break-words drop-shadow-sm">
            {restaurantName}
          </h3>
          <div className="flex items-center gap-2 mt-1.5">
            <span
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider"
              style={{
                background: isPremium
                  ? 'linear-gradient(90deg, #F5A623, #FFD700, #F5A623)'
                  : 'rgba(255,255,255,0.25)',
                color: isPremium ? '#7A4F00' : 'white',
                boxShadow: isPremium ? '0 2px 8px rgba(245,166,35,0.4)' : 'none',
              }}
            >
              <Crown className="w-3 h-3" />
              {isPremium ? 'Premium Gold' : 'Plano Free'}
            </span>
          </div>
          <p className="text-white/70 text-[11px] mt-2 font-medium">
            Toque na câmera para alterar o logo
          </p>
        </div>
      </div>
    </div>
  );
};

export default MainProfileCard;