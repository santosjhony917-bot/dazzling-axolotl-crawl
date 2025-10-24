import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Utensils, ChevronRight, Loader2, Menu as MenuIcon } from 'lucide-react';
import { createPageUrl } from '@/utils/url';
import { useMenuManagement } from '@/hooks/useMenuManagement';
import { Skeleton } from '@/components/ui/skeleton';
import RestaurantAreaHeader from '@/components/restaurant/RestaurantAreaHeader';
import MenuCategoryCard from '@/components/restaurant/menu/MenuCategoryCard';
import AddCategoryDialog from '@/components/restaurant/menu/AddCategoryDialog';
import { useRestaurant } from '@/hooks/useRestaurant';

export default function RestaurantProfileMenu() {
  const navigate = useNavigate();
  // A desestruturação está correta de acordo com a interface MenuManagementResult
  const { categories, isLoading, error, refetch, addCategory } = useMenuManagement();
  const { restaurant } = useRestaurant();
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false);

  const handleAddCategory = async (name: string) => {
    await addCategory(name);
    setIsAddCategoryDialogOpen(false);
  };

  if (isLoading) {
    return (
      <div className="p-4 max-w-md mx-auto space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500 max-w-md mx-auto">
        {/* O erro é tipado como string | null, resolvendo o erro de tipagem */}
        <p>Erro ao carregar o cardápio: {error}</p>
        <Button onClick={refetch} className="mt-4">Tentar Novamente</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7f8] pb-20 max-w-md mx-auto">
      <RestaurantAreaHeader title="Gerenciar Cardápio" icon={MenuIcon} />

      <main className="p-4 space-y-6">
        
        {/* Botão Adicionar Categoria */}
        <Button
          onClick={() => setIsAddCategoryDialogOpen(true)}
          className="w-full flex items-center justify-center gap-2 min-w-[84px] cursor-pointer overflow-hidden rounded-xl h-12 px-4 bg-primary hover:bg-primary/90 text-white text-base font-bold leading-normal tracking-[0.015em]"
        >
          <Plus className="w-5 h-5" />
          Adicionar Nova Categoria
        </Button>

        {/* Lista de Categorias */}
        <div className="space-y-4">
          {categories.length === 0 ? (
            <Card className="shadow-md border-none rounded-xl p-6 text-center">
              <Utensils className="w-8 h-8 text-gray-400 mx-auto mb-3" />
              <p className="text-lg font-semibold text-[#022D68]">Nenhuma Categoria Encontrada</p>
              <p className="text-sm text-gray-500 mt-1">Comece adicionando sua primeira categoria de menu.</p>
            </Card>
          ) : (
            categories.map(category => (
              <MenuCategoryCard 
                key={category.id} 
                category={category} 
                restaurantId={restaurant?.id || ''}
                onEdit={() => navigate(createPageUrl(`restaurant-area/categories/${category.id}`))}
              />
            ))
          )}
        </div>
      </main>

      <AddCategoryDialog
        isOpen={isAddCategoryDialogOpen}
        onClose={() => setIsAddCategoryDialogOpen(false)}
        onSave={handleAddCategory}
      />
    </div>
  );
}