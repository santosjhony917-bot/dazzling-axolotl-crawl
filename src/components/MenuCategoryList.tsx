"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  is_active: boolean;
  order_index: number; // Adicionado
}

interface MenuCategory {
  id: string;
  name: string;
  order_index: number;
  is_active: boolean;
  is_popular: boolean;
  menu_items: MenuItem[];
}

interface MenuCategoryListProps {
  categories: MenuCategory[];
  restaurantId: string;
  isOwner: boolean;
  onEditCategory: (category: MenuCategory) => void;
  onAddMenuItem: (categoryId: string) => void;
  onEditMenuItem: (item: MenuItem) => void;
}

export const MenuCategoryList: React.FC<MenuCategoryListProps> = ({
  categories,
  restaurantId,
  isOwner,
  onEditCategory,
  onAddMenuItem,
  onEditMenuItem,
}) => {
  const queryClient = useQueryClient();

  const deleteMenuItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant', restaurantId] });
      toast.success('Item do cardápio excluído com sucesso!');
    },
    onError: (err) => {
      toast.error('Erro ao excluir item do cardápio: ' + err.message);
    },
  });

  const swapCategoryOrderMutation = useMutation({
    mutationFn: async ({ categoryIdA, categoryIdB }: { categoryIdA: string; categoryIdB: string }) => {
      const { data, error } = await supabase.rpc('swap_category_order', {
        category_id_a: categoryIdA,
        category_id_b: categoryIdB,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant', restaurantId] });
      toast.success('Ordem das categorias atualizada!');
    },
    onError: (err) => {
      toast.error('Erro ao reordenar categorias: ' + err.message);
    },
  });

  const sortedCategories = [...categories].sort((a, b) => a.order_index - b.order_index);

  const handleMoveCategory = (categoryId: string, direction: 'up' | 'down') => {
    const currentIndex = sortedCategories.findIndex(cat => cat.id === categoryId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex >= 0 && targetIndex < sortedCategories.length) {
      const categoryA = sortedCategories[currentIndex];
      const categoryB = sortedCategories[targetIndex];
      swapCategoryOrderMutation.mutate({ categoryIdA: categoryA.id, categoryIdB: categoryB.id });
    }
  };

  return (
    <div className="space-y-4">
      {sortedCategories.map((category, index) => (
        <div key={category.id} className="border rounded-lg bg-white shadow-sm">
          <Accordion type="single" collapsible>
            <AccordionItem value={category.id}>
              <AccordionTrigger className="px-4 py-3 text-lg font-semibold flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {category.name}
                  {!category.is_active && <span className="text-sm text-red-500">(Inativa)</span>}
                  {category.is_popular && <span className="text-sm text-green-600">(Popular)</span>}
                </div>
                {isOwner && (
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleMoveCategory(category.id, 'up'); }} disabled={index === 0}>
                      <ChevronUp size={20} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleMoveCategory(category.id, 'down'); }} disabled={index === sortedCategories.length - 1}>
                      <ChevronDown size={20} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onEditCategory(category); }}>
                      <Edit size={20} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onAddMenuItem(category.id); }}>
                      <Plus size={20} />
                    </Button>
                  </div>
                )}
              </AccordionTrigger>
              <AccordionContent className="p-4">
                {category.menu_items && category.menu_items.length > 0 ? (
                  <div className="space-y-4">
                    {category.menu_items.sort((a, b) => a.order_index - b.order_index).map((item) => (
                      <div key={item.id} className="flex items-center gap-4 border-b pb-4 last:border-b-0 last:pb-0">
                        {item.image_url && (
                          <img src={item.image_url} alt={item.name} className="w-20 h-20 object-cover rounded-md" />
                        )}
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{item.name} {!item.is_active && <span className="text-sm text-red-500">(Inativo)</span>}</h3>
                          {item.description && <p className="text-gray-600 text-sm">{item.description}</p>}
                          <p className="font-bold text-gray-800">R$ {item.price.toFixed(2)}</p>
                        </div>
                        {isOwner && (
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" onClick={() => onEditMenuItem(item)}>
                              <Edit size={20} />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 size={20} className="text-red-500" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação não pode ser desfeita. Isso excluirá permanentemente este item do cardápio.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteMenuItemMutation.mutate(item.id)} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">Nenhum item nesta categoria.</p>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      ))}
    </div>
  );
};