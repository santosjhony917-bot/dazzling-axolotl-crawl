import React from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import NavCardItem from '@/components/NavCardItem';
import { Utensils, Package, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';
import { showError } from '@/utils/toast'; // Importando showError

interface ContentManagementSectionProps {
  navigate: ReturnType<typeof useNavigate>;
  isPremium: boolean;
}

const ContentManagementSection: React.FC<ContentManagementSectionProps> = ({ navigate, isPremium }) => {
  
  const handleNavigate = (path: string, isFeaturePremium: boolean) => {
    if (isFeaturePremium && !isPremium) {
      showError("Recurso Premium. Faça upgrade para desbloquear.");
      return;
    }
    navigate(path);
  };
  
  return (
    <div className="w-full space-y-3">
      <h2 className="text-xl font-bold text-[#022D68] px-1 mb-4">Gerenciamento de Conteúdo</h2>
      <NavCardItem 
        title="Cardápio e Categorias" 
        description="Adicione, edite e organize pratos e categorias."
        icon={Utensils} 
        onClick={() => handleNavigate(createPageUrl('restaurant-area/menu'), false)}
        isPremium={isPremium}
      />
      <NavCardItem 
        title="Galeria de Fotos" 
        description="Gerencie as imagens do seu restaurante."
        icon={Camera} 
        isPremiumFeature={true}
        isPremium={isPremium}
        onClick={() => handleNavigate(createPageUrl('restaurant-area/gallery'), true)}
        premiumDescription="Exclusivo Premium"
      />
    </div>
  );
};

export default ContentManagementSection;