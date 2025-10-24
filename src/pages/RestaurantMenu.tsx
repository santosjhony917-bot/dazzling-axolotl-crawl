import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Utensils, Loader2, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMenuManagement } from '@/hooks/useMenuManagement';
import { MenuCategory, MenuItem } from '@/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useRestaurant } from '@/hooks/useRestaurant';
import { Skeleton } from '@/components/ui/skeleton';
import { showError, showSuccess } from '@/utils/toast';
import { formatPrice } from '@/lib/utils';
import CategoryFormDialog from '@/components/restaurant/menu/CategoryFormDialog';
import ItemFormDialog from '@/components/restaurant/menu/ItemFormDialog';
import MenuItemCard from '@/components/restaurant/menu/MenuItemCard';
import { useImageUpload } from '@/hooks/useImageUpload';
import { RESTAURANT_IMAGES_BUCKET } from '@/integrations/supabase/storage';

const RestaurantMenu: React.FC = () => {
  const navigate = useNavigate();
  const { restaurant, isLoading: isRestaurantLoading } = useRestaurant();
  const restaurantId = restaurant?.id || null;
  
  const { 
    categories, 
    isLoading: isMenuLoading, 
    error: menuError, 
    refetch, 
    addCategory, 
    updateCategory, 
    deleteCategory,
    addItem,
    updateItem,
    deleteItem,
  } = useMenuManagement();

  const { uploadImage, uploading } = useImageUpload();

  // Dialog States
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const handleOpenCategoryDialog = (category: MenuCategory | null = null) => {
    setEditingCategory(category);
    setIsCategoryDialogOpen(true);
  };

  const handleOpenItemDialog = (categoryId: string, item: MenuItem | null = null) => {
    setSelectedCategoryId(categoryId);
    setEditingItem(item);
    setIsItemDialogOpen(true);
  };

  const handleSaveCategory = async (name: string, is_active: boolean) => {
    if (!restaurantId) {
      showError("ID do restaurante não encontrado.");
      return;
    }
    if (editingCategory) {
      await updateCategory(editingCategory.id, name, is_active);
    } else {
      await addCategory(name);
    }
    setIsCategoryDialogOpen(false);
  };

  const handleSaveItem = async (itemData: Omit<MenuItem, 'id' | 'category_id' | 'created_at'>, file: File | null) => {
    if (!selectedCategoryId) return;

    let imageUrl = itemData.image_url;
    
    if (file) {
      const toastId = showSuccess("Fazendo upload da imagem...");
      try {
        const { url, error } = await uploadImage(file, RESTAURANT_IMAGES_BUCKET, restaurantId!, 'item');
        if (error) throw error;
        imageUrl = url;
        showSuccess("Upload concluído!");
      } catch (e) {
        showError("Falha no upload da imagem.");
        return;
      } finally {
        // toast.dismiss(toastId); // Não é necessário se showSuccess/showError já gerenciam
      }
    }

    const itemToSave = { ...itemData, image_url: imageUrl };

    if (editingItem) {
      await updateItem({ ...editingItem, ...itemToSave });
    } else {
      await addItem(selectedCategoryId, itemToSave);
    }
    setIsItemDialogOpen(false);
  };

  if (isRestaurantLoading || isMenuLoading) {
    return (
      <div className="p-4 max-w-md mx-auto space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (menuError) {
    return (
      <div className="p-4 text-center text-red-500">
        Erro ao carregar o cardápio: {menuError}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7f8] pb-20 max-w-md mx-auto">
      <header className="sticky top-0 z-10 bg-white shadow-sm p-4 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-[#022D68] hover:bg-[#022D68]/5">
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-lg font-bold text-[#022D68] flex-1 text-center pr-10 truncate">
          Gerenciar Cardápio
        </h1>
        <Button 
          onClick={() => handleOpenCategoryDialog()}
          className="bg-highlight hover:bg-highlight/90 text-white rounded-full h-10 px-4 text-sm font-bold"
        >
          <Plus className="w-4 h-4 mr-1" /> Categoria
        </Button>
      </header>

      <main className="p-4 space-y-6">
        <Card className="shadow-md border-none rounded-xl p-4">
          <CardContent className="p-0">
            <h2 className="text-xl font-bold text-[#022D68] mb-4 flex items-center gap-2">
              <Utensils className="w-6 h-6" /> Categorias ({categories.length})
            </h2>
            
            {categories.length === 0 ? (
              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <p className="text-gray-600">Comece adicionando sua primeira categoria de pratos.</p>
              </div>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {categories.map(category => (
                  <AccordionItem key={category.id} value={category.id} className="border-b border-gray-200">
                    <AccordionTrigger className="py-4 hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <span className="font-semibold text-base text-gray-800">{category.name} ({category.items.length})</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${category.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {category.is_active ? 'Ativa' : 'Inativa'}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-[#022D68] hover:bg-[#022D68]/10"
                            onClick={(e) => { e.stopPropagation(); handleOpenCategoryDialog(category); }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-red-500 hover:bg-red-50"
                            onClick={(e) => { e.stopPropagation(); deleteCategory(category.id); }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-4">
                      <div className="space-y-3">
                        {category.items.map(item => (
                          <MenuItemCard 
                            key={item.id} 
                            item={item} 
                            onEdit={() => handleOpenItemDialog(category.id, item)}
                            onDelete={() => deleteItem(item.id)}
                            onToggleActive={() => updateItem({ ...item, is_active: !item.is_active })}
                          />
                        ))}
                      </div>
                      <Button
                        onClick={() => handleOpenItemDialog(category.id)}
                        className="w-full mt-4 h-10 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold"
                      >
                        <Plus className="w-4 h-4 mr-1" /> Adicionar Item
                      </Button>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Category Dialog */}
      <CategoryFormDialog
        open={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
        onSave={handleSaveCategory}
        initialData={editingCategory}
        isLoading={false} // Use mutation loading state if available
      />

      {/* Item Dialog */}
      <ItemFormDialog
        open={isItemDialogOpen}
        onOpenChange={setIsItemDialogOpen}
        onSave={handleSaveItem}
        initialData={editingItem}
        isLoading={uploading}
      />
    </div>
  );
};

export default RestaurantMenu;