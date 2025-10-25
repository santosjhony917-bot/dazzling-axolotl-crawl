import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MenuCategory } from "@/types/supabase";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePublicRestaurantProfile } from "@/hooks/usePublicRestaurantProfile";
import { Skeleton } from "@/components/ui/skeleton";
import MenuItemList from "./MenuItemList";

interface MenuCategoryListProps {
  categories: MenuCategory[];
  isLoading: boolean;
  isOwner: boolean;
  restaurantId: string;
}

const MenuCategoryList: React.FC<MenuCategoryListProps> = ({
  categories,
  isLoading,
  isOwner,
  restaurantId,
}) => {
  const { isPremium } = usePublicRestaurantProfile(restaurantId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (categories.length === 0 && !isOwner) {
    return (
      <div className="text-center py-8 text-gray-500">
        Nenhuma categoria de menu ativa encontrada.
      </div>
    );
  }

  return (
    <Accordion type="multiple" className="w-full">
      {categories.map((category) => (
        <AccordionItem
          key={category.id}
          value={category.id}
          className={cn(
            "border-b",
            !category.is_active && !isOwner && "hidden"
          )}
        >
          <AccordionTrigger className="flex justify-between items-center hover:no-underline px-4 py-3">
            <div className="flex items-center space-x-3">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-left">
                {category.name}
              </h3>
              {!category.is_active && isOwner && (
                <span className="text-xs font-medium text-red-500 bg-red-100 px-2 py-0.5 rounded-full">
                  Inativo
                </span>
              )}
            </div>
            {/* Removido o ChevronDown duplicado aqui */}
          </AccordionTrigger>
          <AccordionContent className="p-0">
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              <MenuItemList
                categoryId={category.id}
                isOwner={isOwner}
                isPremium={isPremium}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
      {isOwner && (
        <div className="p-4 border-t">
          <Button variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" /> Adicionar Nova Categoria
          </Button>
        </div>
      )}
    </Accordion>
  );
};

export default MenuCategoryList;