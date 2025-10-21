import React from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import NavCardItem from '@/components/NavCardItem';
import { Utensils, Package, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';
import { showSuccess } from '@/utils/toast';

interface ContentManagementSectionProps {
  navigate: ReturnType<typeof useNavigate>;
}

const ContentManagementSection: React.FC<ContentManagementSectionProps> = ({ navigate }) => {
  return (
    <div className="w-full space-y-3">
      <h2 className="text-xl font-bold text-[#022D68] px-1 mb-4">Gerenciamento de Conteúdo</h2>
      <NavCardItem 
        label="Cardápio e Itens" 
        description="Adicione, edite e remova pratos e produtos."
        icon={Utensils} 
        onClick={() => navigate(createPageUrl('restaurant-area/menu'))}
      />
      <NavCardItem 
        label="Categorias do Cardápio" 
        description="Organize seus itens em categorias."
        icon={Package} 
        onClick={() => navigate(createPageUrl('restaurant-area/categories'))}
      />
      <NavCardItem 
        label="Galeria de Fotos" 
        description="Gerencie as imagens do seu restaurante."
        icon={Camera} 
        onClick={() => showSuccess("Funcionalidade em desenvolvimento")}
      />
    </div>
  );
};

export default ContentManagementSection;