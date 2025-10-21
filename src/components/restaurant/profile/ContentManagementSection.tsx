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
    <Card className="w-full shadow-md border-none rounded-xl p-4 bg-white dark:bg-gray-800"> {/* Alterado shadow-xl para shadow-md e p-6 para p-4, removido mb-6 */}
      <CardHeader className="p-0 mb-4">
        <CardTitle className="text-lg font-bold text-[#022D68]">Gerenciamento de Conteúdo</CardTitle>
      </CardHeader>
      <div className="space-y-3">
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
    </Card>
  );
};

export default ContentManagementSection;