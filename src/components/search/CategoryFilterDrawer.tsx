import React, { useState, useEffect, useMemo } from "react";
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
import { Filter, X } from "lucide-react";
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
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setLocalExcludedCategoryIds(selectedCategoryIds);
  }, [selectedCategoryIds]);

  const uniqueAndNormalizedCategories = useMemo(() => {
    const seenNames = new Set<string>();
    const filtered: MenuCategory[] = [];

    allCategories.forEach(category => {
      // Normaliza o nome da categoria para comparação (minúsculas e sem acentos)
      const normalizedName = category.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      if (!seenNames.has(normalizedName)) {
        seenNames.add(normalizedName);
        filtered.push(category);
      }
    });
    return filtered;
  }, [allCategories]);

  const handleApplyFilter = () => {
    onApply(localExcludedCategoryIds);
    setIsOpen(false);
  };

  const handleClearFilter = () => {
    setLocalExcludedCategoryIds([]);
    onApply([]);
    setIsOpen(false);
  };

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <Button
          variant="ghost"
          className="h-12 px-3 text-foreground hover:bg-accent hover:text-accent-foreground flex-shrink-0"
        >
          <Filter className="w-5 h-5" />
        </Button>
      </DrawerTrigger>
      <DrawerContent
        className="fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[10px] border bg-background outline-none w-full max-w-md mx-auto"
      >
        <DrawerHeader className="relative">
          <DrawerTitle>Filtrar por Categorias</DrawerTitle>
          <DrawerDescription>
            Selecione as categorias que você deseja excluir dos resultados da
            busca.
          </DrawerDescription>
          <DrawerClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </DrawerClose>
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
            {uniqueAndNormalizedCategories.map((category) => (
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