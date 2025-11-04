import React, { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Filter } from "lucide-react";
import { MenuCategory } from "@/types/supabase"; // Importa o tipo MenuCategory do supabase.ts

interface CategoryFilterDrawerProps {
  selectedCategoryIds: string[]; // IDs das categorias atualmente EXCLUÍDAS
  onApply: (excludedIds: string[]) => void;
  allCategories: MenuCategory[]; // Todas as categorias disponíveis
}

const CategoryFilterDrawer: React.FC<CategoryFilterDrawerProps> = ({
  selectedCategoryIds,
  onApply,
  allCategories,
}) => {
  const [open, setOpen] = useState(false);
  const [localExcludedCategoryIds, setLocalExcludedCategoryIds] = useState<string[]>(selectedCategoryIds);

  useEffect(() => {
    setLocalExcludedCategoryIds(selectedCategoryIds);
  }, [selectedCategoryIds]);

  const handleToggleCategory = (categoryId: string) => {
    setLocalExcludedCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleApplyFilter = () => {
    onApply(localExcludedCategoryIds);
    setOpen(false);
  };

  const handleClearFilter = () => {
    setLocalExcludedCategoryIds([]);
    onApply([]);
    setOpen(false);
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button
          variant="outline"
          size="sm" // Alterado para 'sm' para um botão mais compacto
          className="border-gray-300 text-primary hover:bg-highlight/10 shadow-soft-md transition-all" // Removido w-full
        >
          <Filter className="w-4 h-4 mr-1 text-highlight" /> Categorias
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Filtrar por Categoria</DrawerTitle>
          <DrawerDescription>
            Selecione as categorias que você deseja excluir da busca de pratos.
          </DrawerDescription>
        </DrawerHeader>
        <div className="p-4 pb-0">
          <Label className="mb-2 block text-sm font-medium text-gray-700">
            Categorias a Excluir
          </Label>
          <ToggleGroup
            type="multiple"
            value={localExcludedCategoryIds}
            onValueChange={setLocalExcludedCategoryIds}
            className="flex flex-wrap gap-2 justify-start"
          >
            {allCategories.map((category) => (
              <ToggleGroupItem
                key={category.id}
                value={category.id}
                aria-label={`Toggle ${category.name}`}
                className={`rounded-full px-4 py-2 text-sm ${
                  localExcludedCategoryIds.includes(category.id)
                    ? "bg-highlight text-white hover:bg-highlight/90"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {category.name}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <DrawerFooter>
          <Button onClick={handleApplyFilter} variant="highlight">
            Aplicar Filtros
          </Button>
          <Button onClick={handleClearFilter} variant="outline">
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