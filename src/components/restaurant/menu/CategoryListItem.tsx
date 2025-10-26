import { MenuCategory } from '@/types';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown, Edit, Trash2 } from 'lucide-react';
import { useCategoryReorder } from '@/hooks/useCategoryReorder';
import { useMenuManagement } from '@/hooks/useMenuManagement'; 
import { cn } from '@/lib/utils';

interface CategoryListItemProps {
  category: MenuCategory;
  restaurantId: string;
  isFirst: boolean;
  isLast: boolean;
  onEdit: (category: MenuCategory) => void;
  onSwap: (category: MenuCategory, direction: 'UP' | 'DOWN') => void; 
  onDelete: (categoryId: string) => void;
}

export function CategoryListItem({
  category,
  restaurantId,
  isFirst,
  isLast,
  onEdit,
  onDelete,
  onSwap,
}: CategoryListItemProps) {
  const { mutate: swapOrder, isPending: isSwapping } = useCategoryReorder(restaurantId);
  // Acessando deleteCategoryMutation do useMenuManagement
  const { deleteCategoryMutation } = useMenuManagement(restaurantId); 
  
  const handleDelete = () => {
    if (confirm(`Tem certeza que deseja deletar a categoria "${category.name}"?`)) {
      deleteCategoryMutation.mutate(category.id);
    }
  };

  const handleMoveUp = () => {
    onSwap(category, 'UP'); 
  };

  const handleMoveDown = () => {
    onSwap(category, 'DOWN'); 
  };

  return (
    <div className="flex items-center justify-between p-3 border-b last:border-b-0 hover:bg-gray-50 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{category.name}</p>
        <p className={cn("text-sm", category.is_active ? "text-green-600" : "text-red-600")}>
          {category.is_active ? 'Ativa' : 'Inativa'}
        </p>
      </div>

      <div className="flex items-center space-x-2">
        {/* Reordering Controls */}
        <Button 
          variant="outline" 
          size="icon" 
          onClick={handleMoveUp} 
          disabled={isFirst || isSwapping}
          title="Mover para Cima"
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={handleMoveDown} 
          disabled={isLast || isSwapping}
          title="Mover para Baixo"
        >
          <ArrowDown className="h-4 w-4" />
        </Button>

        {/* Action Controls */}
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => onEdit(category)}
          title="Editar"
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button 
          variant="destructive" 
          size="icon" 
          onClick={handleDelete}
          disabled={deleteCategoryMutation.isPending}
          title="Deletar"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}