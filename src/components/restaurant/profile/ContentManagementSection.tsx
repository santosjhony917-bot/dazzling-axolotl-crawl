import React from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import NavCardItem from '@/components/NavCardItem';
import { Utensils, Package, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';
import { showSuccess } from '@/utils/toast';
import { cn } from '@/lib/utils'; // Importando cn

interface ContentManagementSectionProps {
  navigate: ReturnType<typeof useNavigate>;
}

const ContentManagementSection: React.FC<ContentManagementSectionProps> = ({ navigate }) => {
  return (
    <Card 
      className={cn(
        "w-full p-6 transition-all",
        "bg-[#f5f7f8] border border-gray-200 rounded-xl shadow-sm hover:shadow-md",
        "dark:bg-gray-800 dark:hover:bg-gray-700",
        "mb-6"
      )}
    >
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