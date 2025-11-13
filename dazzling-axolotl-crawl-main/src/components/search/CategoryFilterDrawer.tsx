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

interface CategoryDisplay {
  id: string;
  name: string;
}

interface CategoryFilterDrawerProps {
  selectedCategoryIds: string[]; // Estes são os IDs que o pai *quer filtrar* (seja para excluir ou incluir)
  onApply: (filteredIds: string[]) => void; // Passará os IDs filtrados (excluídos ou incluídos)
  allCategories: CategoryDisplay[];
  filterMode?: 'include' | 'exclude'; // Nova propriedade para controlar o comportamento
}

const normalizeCategoryName = (name: string) =>
  name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export default function CategoryFilterDrawer({
  selectedCategoryIds,
  onApply,
  allCategories,
  filterMode = 'exclude', // Padrão para 'exclude' (para pratos)
}: CategoryFilterDrawerProps) {
  // Estado local para os nomes normalizados das categorias que o usuário *selecionou* no drawer
  const [localSelectedNormalizedNames, setLocalSelectedNormalizedNames] =
    useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const categoryIdToNormalizedNameMap = useMemo(() => {
    const map = new Map<string, string>();
    allCategories.forEach(category => {
      map.set(category.id, normalizeCategoryName(category.name));
    });
    return map;
  }, [allCategories]);

  const uniqueDisplayCategories = useMemo(() => {
    const seenNormalizedNames = new Set<string>();
    const displayCategories: { normalizedName: string; originalName: string }[] = [];

    allCategories.forEach(category => {
      const normalized = normalizeCategoryName(category.name);
      if (!seenNormalizedNames.has(normalized)) {
        seenNormalizedNames.add(normalized);
        displayCategories.push({ normalizedName: normalized, originalName: category.name });
      }
    });
    return displayCategories;
  }, [allCategories]);

  // Inicializa os nomes selecionados localmente com base nos IDs selecionados pelo pai
  useEffect(() => {
    const initialNormalizedNames = new Set<string>();
    selectedCategoryIds.forEach(id => {
      const normalizedName = categoryIdToNormalizedNameMap.get(id);
      if (normalizedName) {
        initialNormalizedNames.add(normalizedName);
      }
    });
    setLocalSelectedNormalizedNames(Array.from(initialNormalizedNames));
  }, [selectedCategoryIds, categoryIdToNormalizedNameMap]);

  const handleApplyFilter = () => {
    const finalFilteredIds: string[] = [];
    localSelectedNormalizedNames.forEach(normalizedName => {
      allCategories.forEach(category => {
        if (normalizeCategoryName(category.name) === normalizedName) {
          finalFilteredIds.push(category.id);
        }
      });
    });
    onApply(finalFilteredIds); // Passa a lista de IDs correspondentes aos nomes normalizados selecionados
    setIsOpen(false);
  };

  const handleClearFilter = () => {
    setLocalSelectedNormalizedNames([]);
    onApply([]); // Limpa todos os filtros
    setIsOpen(false);
  };

  const drawerTitle = "Filtrar por Categorias";
  const drawerDescription = filterMode === 'exclude'
    ? "Selecione as categorias que você deseja excluir dos resultados da busca."
    : "Selecione as categorias que você deseja incluir nos resultados da busca.";
  const labelText = filterMode === 'exclude'
    ? "Categorias a Excluir"
    : "Categorias a Incluir"; // Para restaurantes, o usuário pediu apenas "Categorias"

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
          <DrawerTitle>{drawerTitle}</DrawerTitle>
          <DrawerDescription>
            {drawerDescription}
          </DrawerDescription>
          <DrawerClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </DrawerClose>
        </DrawerHeader>
        <div className="p-4 pb-0">
          <Label className="mb-2 block text-sm font-medium text-gray-700">
            {filterMode === 'include' ? 'Categorias' : labelText} {/* Ajuste para mostrar apenas 'Categorias' no modo include */}
          </Label>
          <ToggleGroup
            type="multiple"
            value={localSelectedNormalizedNames}
            onValueChange={setLocalSelectedNormalizedNames}
            className="flex flex-wrap gap-2 justify-start"
          >
            {uniqueDisplayCategories.map((category) => (
              <ToggleGroupItem
                key={category.normalizedName}
                value={category.normalizedName}
                aria-label={`Toggle ${category.originalName}`}
                className={`rounded-full px-4 py-2 text-sm ${
                  localSelectedNormalizedNames.includes(category.normalizedName)
                    ? "bg-highlight text-white hover:bg-highlight/90"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {category.originalName}
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