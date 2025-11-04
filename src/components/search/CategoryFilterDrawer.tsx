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
// Não precisamos mais do MenuCategory aqui, pois a interface será mais genérica
// import { MenuCategory } from "@/types/supabase"; 

// Define a interface mais genérica para categorias que o drawer pode exibir
interface CategoryDisplay {
  id: string;
  name: string;
}

interface CategoryFilterDrawerProps {
  selectedCategoryIds: string[]; // Estes são os IDs que o pai *já* tem como excluídos
  onApply: (excludedIds: string[]) => void;
  allCategories: CategoryDisplay[]; // Agora aceita um tipo mais genérico
}

// Helper para normalizar nomes de categorias (minúsculas e sem acentos)
const normalizeCategoryName = (name: string) =>
  name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export default function CategoryFilterDrawer({
  selectedCategoryIds,
  onApply,
  allCategories,
}: CategoryFilterDrawerProps) {
  // Estado local para os nomes normalizados das categorias que o usuário deseja excluir
  const [localExcludedNormalizedNames, setLocalExcludedNormalizedNames] =
    useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Mapeia todos os IDs de categorias para seus nomes normalizados
  const categoryIdToNormalizedNameMap = useMemo(() => {
    const map = new Map<string, string>();
    allCategories.forEach(category => {
      map.set(category.id, normalizeCategoryName(category.name));
    });
    return map;
  }, [allCategories]);

  // Cria uma lista de categorias únicas para exibição no ToggleGroup
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

  // Inicializa o estado local de nomes excluídos com base nos IDs já excluídos pelo pai
  useEffect(() => {
    const initialNormalizedNames = new Set<string>();
    selectedCategoryIds.forEach(id => {
      const normalizedName = categoryIdToNormalizedNameMap.get(id);
      if (normalizedName) {
        initialNormalizedNames.add(normalizedName);
      }
    });
    setLocalExcludedNormalizedNames(Array.from(initialNormalizedNames));
  }, [selectedCategoryIds, categoryIdToNormalizedNameMap]);

  const handleApplyFilter = () => {
    // Converte os nomes normalizados selecionados de volta para *todos* os IDs correspondentes
    const finalExcludedIds: string[] = [];
    localExcludedNormalizedNames.forEach(normalizedName => {
      allCategories.forEach(category => {
        if (normalizeCategoryName(category.name) === normalizedName) {
          finalExcludedIds.push(category.id);
        }
      });
    });
    onApply(finalExcludedIds);
    setIsOpen(false);
  };

  const handleClearFilter = () => {
    setLocalExcludedNormalizedNames([]);
    onApply([]); // Limpa todos os filtros
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
            value={localExcludedNormalizedNames} // Agora o valor é o nome normalizado
            onValueChange={setLocalExcludedNormalizedNames}
            className="flex flex-wrap gap-2 justify-start"
          >
            {uniqueDisplayCategories.map((category) => (
              <ToggleGroupItem
                key={category.normalizedName} // Chave pelo nome normalizado
                value={category.normalizedName} // Valor é o nome normalizado
                aria-label={`Toggle ${category.originalName}`}
                className={`rounded-full px-4 py-2 text-sm ${
                  localExcludedNormalizedNames.includes(category.normalizedName)
                    ? "bg-highlight text-white hover:bg-highlight/90"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {category.originalName} {/* Exibe o nome original */}
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