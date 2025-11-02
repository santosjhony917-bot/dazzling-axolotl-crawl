import React from 'react';
import { DraggableProvided } from '@hello-pangea/dnd';
import { GripVertical, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/integrations/base44Client';
import { showError, showSuccess } from '@/utils/toast';

interface CategoryListItemProps {
  category: {
    id: string;
    name: string;
    order_index: number;
    is_active: boolean;
  };
  provided: DraggableProvided;
  isDragging: boolean;
  onDelete: (categoryId: string) => void;
}

const CategoryListItem: React.FC<CategoryListItemProps> = ({ category, provided, isDragging, onDelete }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const toggleActiveMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      const { error } = await base44.integrations.supabase.from('menu_categories')
        .update({ is_active: !category.is_active })
        .eq('id', categoryId);
      if (error) throw error;
      return categoryId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuCategories', category.restaurant_id] });
      showSuccess(`Categoria "${category.name}" ${category.is_active ? 'desativada' : 'ativada'} com sucesso!`);
    },
    onError: (err) => {
      showError(`Falha ao ${category.is_active ? 'desativar' : 'ativar'} categoria: ${err.message}`);
    },
  });

  const { mutate: toggleActive, isLoading: isMutating } = toggleActiveMutation;

  const handleEditClick = () => {
    if (!isMutating) {
      navigate(createPageUrl('restaurant-area-category-details', { categoryId: category.id }));
    }
  };

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      className={cn(
        "flex items-center bg-white rounded-lg shadow-sm p-3 mb-2 transition-all duration-200",
        isDragging ? "shadow-md ring-2 ring-highlight" : "",
        !category.is_active && "opacity-60 bg-gray-100"
      )}
    >
      <div {...provided.dragHandleProps} className="p-2 cursor-grab text-gray-400 hover:text-gray-600">
        <GripVertical size={20} />
      </div>
      <div className="flex-1 ml-2">
        <h3 className="font-semibold text-primary">{category.name}</h3>
        <p className="text-sm text-text-secondary">Ordem: {category.order_index}</p>
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => toggleActive(category.id)}
          disabled={isMutating}
          className={cn(category.is_active ? "text-green-600 hover:bg-green-50" : "text-red-600 hover:bg-red-50")}
        >
          {category.is_active ? <Eye size={20} /> : <EyeOff size={20} />}
        </Button>
        <Button variant="ghost" size="icon" onClick={handleEditClick} disabled={isMutating}>
          <Pencil size={20} className="text-blue-600" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(category.id)} disabled={isMutating}>
          <Trash2 size={20} className="text-red-600" />
        </Button>
      </div>
    </div>
  );
};

export default CategoryListItem;