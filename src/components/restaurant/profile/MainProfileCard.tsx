import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ImageUploadButton } from '@/components/ImageUploadButton';
import { Store, Camera, Check } from 'lucide-react';
import { DEFAULT_RESTAURANT_LOGO_URL } from "@/constants/assets"; // Importando a constante

interface MainProfileCardProps {
  restaurantName: string;
  logoUrl: string | null | undefined;
  isPremium: boolean;
  uploading: boolean;
  handleFileSelect: (file: File, type: 'logo' | 'cover') => Promise<void>;
}

const MainProfileCard: React.FC<MainProfileCardProps> = ({
  restaurantName,
  logoUrl,
  isPremium,
  uploading,
  handleFileSelect,
}) => {
  return (
    <Card className="w-full shadow-md border-none rounded-xl p-4 bg-white dark:bg-gray-800">
      <div className="flex items-start gap-4">
        {/* Logo */}
        <div className="relative w-20 h-20 rounded-full border-4 border-white bg-gray-200 dark:bg-gray-600 shrink-0 shadow-md">
          <img 
            src={logoUrl || DEFAULT_RESTAURANT_LOGO_URL} 
            alt="Logo do Restaurante" 
            className="w-full h-full object-cover rounded-full"
          />
          <ImageUploadButton
            onFileSelect={(file) => handleFileSelect(file, 'logo')}
            uploading={uploading}
            className="absolute bottom-0 right-0 h-6 w-6 p-0 bg-[#E47948] text-white hover:bg-[#E47948]/90"
            icon={<Camera className="h-3 w-3" />}
          />
        </div>
        
        {/* Status */}
        <div className="flex-1 pt-2">
          <h3 className="font-bold text-xl text-[#022D68]">{restaurantName}</h3>
          <div className="flex items-center gap-2 mt-1">
            <Badge 
              variant="outline" 
              className="text-xs font-semibold border-gray-400 text-gray-600 bg-white"
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
          <p className="text-sm text-gray-500 mt-2">Clique no logo para alterar.</p>
        </div>
      </div>
    </Card>
  );
};

export default MainProfileCard;