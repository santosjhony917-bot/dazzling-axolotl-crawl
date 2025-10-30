import React, { useState } from 'react';
import { Utensils, AlertTriangle, PlusCircle, Loader2, ArrowUp, ArrowDown } from 'lucide-react';
import { Link } from 'react-router-dom';

import RestaurantAreaPageLayout from '@/components/layouts/RestaurantAreaPageLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useRestaurantOwner } from '@/hooks/useRestaurantOwner';
import { useMenuManagement, useCategoryMutations } from '@/hooks/useCategoryManagement';
import CategoryFormModal from '@/components/restaurant/CategoryFormModal';
import CategoryCard from '@/components/restaurant/CategoryCard';
import { Category } from '@/types/restaurant';

const MenuManagement: React.FC = () => {
  const { restaurantId, isLoading: isRestaurantLoading } = useRestaurantOwner();
  const { categories, isLoading: isCategoriesLoading, refetchCategories } = useMenuManagement(restaurantId);
  const { addCategory, swapCategoryOrder } = useCategoryMutations(restaurantId, refetchCategories);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const handleOpenModal = (category: Category | null = null) => {
    setEditingCategory(category);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  const handleSaveCategory = async (name: string) => {
    if (!restaurantId) {
      console.error("Cannot add category: Restaurant ID is missing.");
      return;
    }
    await addCategory(name);
    handleCloseModal();
  };

  const canManageMenu = !!restaurantId;

  if (isRestaurantLoading) {
    return (
      <RestaurantAreaPageLayout title="Gerenciar Cardápio" icon={Utensils} backPath="restaurant-area/profile-menu">
        <div className="p-4 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-sm text-gray-500">Carregando informações do restaurante...</p>
        </div>
      </RestaurantAreaPageLayout>
    );
  }

  return (
    <RestaurantAreaPageLayout title="Gerenciar Cardápio" icon={Utensils} backPath="/restaurant-area/profile-menu">
      <div className="p-4 space-y-6">
        
        {!canManageMenu && (
          <Card className="p-4 text-center border-dashed border-2 border-red-300 bg-red-50">
            <div className="flex items-center justify-center mb-2">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <h3 className="text-lg font-semibold text-red-700">Restaurante Não Configurado</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Você precisa criar e configurar seu restaurante para adicionar categorias e itens ao cardápio.
            </p>
            <Link to="/restaurant-area/profile-menu">
              <Button size="sm" className="bg-red-600 hover:bg-red-700">Ir para Configuração</Button>
            </Link>
          </Card>
        )}

        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Categorias do Cardápio</h2>
          <Button 
            onClick={() => handleOpenModal()} 
            disabled={!canManageMenu}
            className="flex items-center"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Adicionar Categoria
          </Button>
        </div>

        <Separator />

        {isCategoriesLoading ? (
          <div className="text-center py-10">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-2 text-sm text-gray-500">Carregando categorias...</p>
          </div>
        ) : categories.length === 0 ? (
          <p className="text-center text-gray-500">
            {canManageMenu ? "Nenhuma categoria encontrada. Clique em 'Adicionar Categoria' para começar." : "Crie seu restaurante para começar a adicionar categorias."}
          </p>
        ) : (
          <div className="space-y-4">
            {categories.map((category, index) => (
              <CategoryCard 
                key={category.id} 
                category={category} 
                onEdit={() => handleOpenModal(category)}
                onMoveUp={index > 0 ? () => swapCategoryOrder(category.id, categories[index - 1].id) : undefined}
                onMoveDown={index < categories.length - 1 ? () => swapCategoryOrder(category.id, categories[index + 1].id) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      <CategoryFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveCategory}
        initialData={editingCategory}
      />
    </RestaurantAreaPageLayout>
  );
};

export default MenuManagement;