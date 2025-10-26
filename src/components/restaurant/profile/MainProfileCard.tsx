import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ImageUploadButton } from '@/components/ImageUploadButton';
import { Store, Camera, Check } from 'lucide-react';
import { DEFAULT_RESTAURANT_LOGO_URL } from "@/constants/assets"; // Importando a constante
import { RESTAURANT_IMAGES_BUCKET } from '@/integrations/supabase/storage';
import { cn } from '@/lib/utils';

interface MainProfileCardProps {
  restaurantName: string;
  logoUrl: string | null | undefined;
  isPremium: boolean;
  uploading: boolean;
  onLogoUploadComplete: (url: string) => void; // Nova prop para receber a URL
  restaurantId: string; // Necessário para o folderPath
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
    <Card className="w-full shadow-soft-xl border-none rounded-2xl p-6 bg-white dark:bg-gray-800">
      <div className="flex items-start gap-4">
        {/* Logo */}
        <div className="relative w-24 h-24 rounded-full border-4 border-white bg-gray-200 dark:bg-gray-600 shrink-0 shadow-lg">
          <img 
            src={logoUrl || DEFAULT_RESTAURANT_LOGO_URL} 
            alt="Logo do Restaurante" 
            className="w-full h-full object-cover rounded-full"
          />
          <ImageUploadButton
            imageUrl={logoUrl || undefined}
            onUploadComplete={onLogoUploadComplete}
            bucketName={RESTAURANT_IMAGES_BUCKET}
            folderPath={restaurantId || 'temp'}
            className="absolute bottom-0 right-0 h-7 w-7 p-0 bg-[#E47948] text-white hover:bg-[#E47948]/90 rounded-full shadow-md"
            icon={<Camera className="h-3 w-3" />}
          />
        </div>
        
        {/* Status */}
        <div className="flex-1 pt-2">
          <h3 className="font-bold text-2xl text-[#022D68] leading-tight">{restaurantName}</h3>
          <div className="flex items-center gap-2 mt-2">
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs font-semibold border-gray-400 text-gray-600 bg-white",
                isPremium && "border-amber-500 text-amber-700 bg-amber-50"
              )}
            >
              <Store className="w-3 h-3 mr-1" />
              {isPremium ? "Premium" : "Free"}
            </Badge>
            <Badge 
              variant="secondary" 
              className="text-xs font-semibold bg-green-100 text-green-700"
            >
              <Check className="w-3 h-3 mr-1" />
              Verificado
            </Badge>
          </div>
          <p className="text-sm text-gray-500 mt-2">Clique no ícone para alterar o logo.</p>
        </div>
      </div>
    </Card>
  );
};

export default MainProfileCard;