import React from 'react';
import { Lock, Eye, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';
import { ImageUploadButton } from '@/components/ImageUploadButton';
import restaurantLogo from "@/assets/restaurant-logo.png";

interface ProfileHeaderManagementProps {
  restaurantName: string;
  logoUrl: string | null | undefined;
  coverImageUrl: string | null | undefined;
  isPremium: boolean;
  uploading: boolean;
  handleFileSelect: (file: File, type: 'logo' | 'cover') => void;
  restaurantId: string;
}

const ProfileHeaderManagement: React.FC<ProfileHeaderManagementProps> = ({
  restaurantName,
  logoUrl,
  coverImageUrl,
  isPremium,
  uploading,
  handleFileSelect,
  restaurantId,
}) => {
  const navigate = useNavigate();
  const planLabel = isPremium ? 'Plano Premium' : 'Plano Free';
  const planColor = isPremium ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-gray-200 hover:bg-gray-300 text-gray-700';

  const handleViewPublicProfile = () => {
    navigate(`/restaurant-profile/${restaurantId}`);
  };

  return (
    <div className="w-full space-y-4">
      {/* Área da Capa */}
      <div className={cn(
        "relative w-full h-40 rounded-xl overflow-hidden bg-[#022D68] shadow-lg",
        coverImageUrl ? "bg-cover bg-center" : ""
      )} style={{ backgroundImage: coverImageUrl ? `url(${coverImageUrl})` : 'none' }}>
        
        {/* Overlay para escurecer a imagem e garantir contraste */}
        {coverImageUrl && <div className="absolute inset-0 bg-black/30" />}

        {/* Botão Editar Capa */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
          <ImageUploadButton
            onFileSelect={(file) => handleFileSelect(file, 'cover')}
            uploading={uploading}
            disabled={!isPremium || uploading}
            className={cn(
              "h-10 px-4 rounded-full text-sm font-semibold transition-all",
              isPremium ? "bg-white text-[#022D68] hover:bg-gray-100" : "bg-gray-600/80 text-white cursor-not-allowed"
            )}
          >
            {uploading ? (
              "Enviando..."
            ) : (
              <>
                <Lock className="w-4 h-4 mr-2" />
                Editar capa ({isPremium ? 'Premium' : 'Premium'})
              </>
            )}
          </ImageUploadButton>
        </div>
      </div>

      {/* Card de Informações (Flutuante) */}
      <Card className="relative -mt-16 mx-4 p-4 bg-white rounded-xl shadow-xl z-20">
        <div className="flex items-start gap-4">
          {/* Logo */}
          <div className="relative w-20 h-20 rounded-full border-4 border-white bg-gray-200 shrink-0 shadow-md">
            <img 
              src={logoUrl || restaurantLogo} 
              alt="Logo do Restaurante" 
              className="w-full h-full object-cover rounded-full"
            />
            <ImageUploadButton
              onFileSelect={(file) => handleFileSelect(file, 'logo')}
              uploading={uploading}
              className="absolute bottom-0 right-0 h-6 w-6 p-0 bg-[#E47948] text-white hover:bg-[#E47948]/90"
              variant="default"
              size="icon"
            >
              <Camera className="h-3 w-3" />
            </ImageUploadButton>
          </div>
          
          {/* Nome e Plano */}
          <div className="flex-1 pt-1">
            <h3 className="font-bold text-xl text-[#022D68] leading-tight">
              {restaurantName}
            </h3>
            <p className="text-sm text-gray-600 mt-1">Estabelecimento</p>
            <p className="text-sm text-gray-600">Comercial</p>
          </div>
          
          {/* Badge Plano */}
          <Badge 
            className={cn(
              "text-xs font-semibold px-3 py-1 mt-1 shrink-0",
              planColor
            )}
          >
            {planLabel}
          </Badge>
        </div>
      </Card>

      {/* Botão Ver Perfil Público */}
      <div className="px-4">
        <Button
          onClick={handleViewPublicProfile}
          className="w-full h-12 rounded-full bg-[#022D68] hover:bg-[#022D68]/90 text-white font-bold shadow-lg"
        >
          <Eye className="h-5 w-5 mr-2" />
          Ver meu perfil público
        </Button>
      </div>
    </div>
  );
};

export default ProfileHeaderManagement;