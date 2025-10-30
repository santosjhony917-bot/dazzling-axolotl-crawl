"use client";

import React from 'react';
import { MenuCategory } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Edit, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
// import Link from 'next/link'; // Removido

interface CategoryListItemProps {
  category: MenuCategory;
  onEdit: (category: MenuCategory) => void;
  onDelete: (categoryId: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  isMutating: boolean;
}

const CategoryListItem: React.FC<CategoryListItemProps> = ({
  category,
  onEdit,
  onDelete,
  isMutating,
}) => {
  const statusText = category.is_active ? 'Ativa' : 'Inativa';
  const statusVariant = category.is_active ? 'default' : 'secondary';

  return (
    <Card className="p-4 flex items-center justify-between transition-shadow hover:shadow-md">
      <div className="flex items-center space-x-4 min-w-0">
        <div className="flex-shrink-0">
          <Badge variant={statusVariant}>{statusText}</Badge>
        </div>
        <div className="min-w-0">
          {/* Substituído Link por <a> */}
          <a href={`/restaurant-area/menu/${category.id}`} className="text-lg font-semibold text-primary hover:underline truncate">
            {category.name}
          </a>
        </div>
      </div>

      <div className="flex items-center space-x-2 flex-shrink-0">
        
        <Button 
          variant="outline" 
          size="icon" 
          onClick={(e) => { e.stopPropagation(); onEdit(category); }}
          disabled={isMutating}
          aria-label="Editar Categoria"
        >
          <Edit className="h-4 w-4" />
        </Button>
        
        <Button 
          variant="destructive" 
          size="icon" 
          onClick={(e) => { e.stopPropagation(); onDelete(category.id); }}
          disabled={isMutating}
          aria-label="Excluir Categoria"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
};

export default CategoryListItem;