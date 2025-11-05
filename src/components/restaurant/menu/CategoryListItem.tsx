"use client";

import React from 'react';
import { MenuCategory } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Edit, Trash2, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom'; // Importando useNavigate
import { createPageUrl } from '@/utils/url'; // Importando createPageUrl

interface CategoryListItemProps {
  category: MenuCategory;
  onEdit: (category: MenuCategory) => void;
  onDelete: (categoryId: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  isMutating: boolean;
  disableNavigation?: boolean;
  onView?: (category: MenuCategory) => void;
}

const CategoryListItem: React.FC<CategoryListItemProps> = ({
  category,
  onEdit,
  onDelete,
  isMutating,
  disableNavigation = false,
  onView,
}) => {
  const navigate = useNavigate(); // Inicializando useNavigate
  const statusText = category.is_active ? 'Ativa' : 'Inativa';
  const statusVariant = category.is_active ? 'default' : 'secondary';
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isMutating) return;

    if (disableNavigation) {
      onView?.(category);
    } else {
      navigate(createPageUrl('restaurant-area/category-details', { categoryId: category.id }));
    }
  };

  return (
    <Card 
      className={`p-4 flex items-center justify-between transition-shadow hover:shadow-md ${onView || !disableNavigation ? 'cursor-pointer' : 'cursor-default'}`}
      onClick={handleClick}
    >
      <div className="flex items-center space-x-4 min-w-0 flex-1">
        <div className="flex-shrink-0">
          <Badge variant={statusVariant}>{statusText}</Badge>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold text-primary hover:underline truncate">
            {category.name}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2 flex-shrink-0">
        
        {/* Botão de Edição */}
        <Button 
          variant="outline" 
          size="icon" 
          onClick={(e) => { e.stopPropagation(); onEdit(category); }}
          disabled={isMutating}
          aria-label="Editar Categoria"
        >
          <Edit className="h-4 w-4" />
        </Button>
        
        {/* Botão de Exclusão */}
        <Button 
          variant="destructive" 
          size="icon" 
          onClick={(e) => { e.stopPropagation(); onDelete(category.id); }}
          disabled={isMutating}
          aria-label="Excluir Categoria"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        
        {/* Ícone de Navegação (Visual) */}
        <ChevronRight className="h-5 w-5 text-gray-400 ml-2" />
      </div>
    </Card>
  );
};

export default CategoryListItem;