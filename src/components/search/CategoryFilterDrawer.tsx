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
import { MenuCategory } from "@/types/supabase";

interface CategoryFilterDrawerProps {
  selectedCategoryIds: string[];
  onApply: (excludedIds: string[]) => void;
  allCategories: MenuCategory[];
}

export default function CategoryFilterDrawer({
  selectedCategoryIds,
  onApply,
  allCategories,
}: CategoryFilterDrawerProps) {
  const [localExcludedCategoryIds, setLocalExcludedCategoryIds] =
    useState<string[]>(selectedCategoryIds);

  useEffect(() => {
    setLocalExcludedCategoryIds(selectedCategoryIds);
  }, [selectedCategoryIds]);

  const handleApplyFilter = () => {
    onApply(localExcludedCategoryIds);
  };

  const handleClearFilter = () => {
    setLocalExcludedCategoryIds([]);
    onApply([]);
  };

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button
          variant="ghost" // Remove o fundo e a borda, dando uma aparência mais leve
          className="h-12 px-3 text-foreground hover:bg-accent hover:text-accent-foreground flex-shrink-0" // Ajusta a altura, padding, cor do ícone e efeitos de hover
        >
          <Filter className="w-5 h-5" /> {/* Apenas o ícone, sem texto */}
        </Button>
      </DrawerTrigger>
      <DrawerContent
        className="fixed bottom-0 left-1/2 right-auto -translate-x-1/2 z-50 mt-24 flex h-auto flex-col rounded-t-[10px] border bg-background outline-none w-full max-w-lg"
      >
        <DrawerHeader>
          <DrawerTitle>Filtrar por Categorias</DrawerTitle>
          <DrawerDescription>
            Selecione as categorias que você deseja excluir dos resultados da
            busca.
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
          <Button onClick={handleApplyFilter}>Aplicar Filtro</Button>
          <Button variant="outline" onClick={handleClearFilter}>
            Limpar Filtro
          </Button>
          <DrawerClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}