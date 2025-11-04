"use client";

import React, { useState, useEffect } from 'react';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MenuCategory } from "@/types/supabase";
import { toast } from "sonner";

interface CategoryFilterDrawerProps {
  selectedCategoryIds: string[];
  onApply: (selectedIds: string[]) => void;
  restaurantId?: string; // Optional: if we want to filter categories by restaurant
}

const CategoryFilterDrawer: React.FC<CategoryFilterDrawerProps> = ({
  selectedCategoryIds,
  onApply,
  restaurantId,
}) => {
  const [open, setOpen] = useState(false);
  const [allCategories, setAllCategories] = useState<MenuCategory[]>([]);
  const [currentSelection, setCurrentSelection] = useState<string[]>(selectedCategoryIds);
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true);
      let query = supabase.from('menu_categories').select('*').order('name', { ascending: true });

      if (restaurantId) {
        query = query.eq('restaurant_id', restaurantId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching categories:", error);
        toast.error("Erro ao carregar categorias.");
      } else {
        setAllCategories(data || []);
      }
      setLoadingCategories(false);
    };

    fetchCategories();
  }, [restaurantId]);

  useEffect(() => {
    setCurrentSelection(selectedCategoryIds);
  }, [selectedCategoryIds]);

  const handleCheckboxChange = (categoryId: string, checked: boolean) => {
    setCurrentSelection((prev) =>
      checked ? [...prev, categoryId] : prev.filter((id) => id !== categoryId)
    );
  };

  const handleApply = () => {
    onApply(currentSelection);
    setOpen(false);
  };

  const handleClear = () => {
    setCurrentSelection([]);
    onApply([]);
    setOpen(false);
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline" className="flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-lg border-gray-300">
          <Filter className="h-4 w-4" />
          <span>Categorias</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>Filtrar por Categorias</DrawerTitle>
          <DrawerDescription>
            Selecione as categorias que deseja excluir dos resultados.
          </DrawerDescription>
        </DrawerHeader>
        <div className="p-4 pb-0 max-h-[60vh] overflow-y-auto">
          {loadingCategories ? (
            <p className="text-center text-gray-500">Carregando categorias...</p>
          ) : allCategories.length === 0 ? (
            <p className="text-center text-gray-500">Nenhuma categoria encontrada.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {allCategories.map((category) => (
                <div key={category.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`category-${category.id}`}
                    checked={currentSelection.includes(category.id)}
                    onCheckedChange={(checked) =>
                      handleCheckboxChange(category.id, checked as boolean)
                    }
                  />
                  <label
                    htmlFor={`category-${category.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {category.name}
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>
        <DrawerFooter>
          <Button onClick={handleApply}>Aplicar Filtros</Button>
          <Button variant="outline" onClick={handleClear}>
            Limpar Filtros
          </Button>
          <DrawerClose asChild>
            <Button variant="ghost">Cancelar</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default CategoryFilterDrawer;