import React from 'react';
import { DraggableProvided } from '@hello-pangea/dnd';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useUpdateMenuItem } from '@/hooks/useMenuItemManagement';
import { formatCurrency } from '@/lib/utils';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface MenuItemListItemProps {
  item: {
    id: string;
    name: string;
    description?: string;
    price: number;
    image_url?: string;
    is_active: boolean;
  };
  provided?: DraggableProvided; // Tornando a prop 'provided' opcional
  onEdit: (item: any) => void;
  onDelete: (itemId: string) => void;
  restaurantId?: string;
}

const MenuItemListItem: React.FC<MenuItemListItemProps> = ({ item, provided, onEdit, onDelete, restaurantId }) => {
  const { mutate: updateMenuItem } = useUpdateMenuItem();

  const handleToggleActive = (checked: boolean) => {
    updateMenuItem({ id: item.id, updates: { is_active: checked } });
  };

  return (
    <div
      ref={provided?.innerRef} // Usando optional chaining para 'provided'
      {...provided?.draggableProps} // Usando optional chaining para 'provided'
      {...provided?.dragHandleProps} // Usando optional chaining para 'provided'
      className="flex items-center bg-white p-4 rounded-lg shadow-sm mb-3"
    >
      <img
        src={item.image_url || PLACEHOLDER_IMAGE_URL}
        alt={item.name}
        className="w-16 h-16 object-cover rounded-md mr-4"
      />
      <div className="flex-grow">
        <h3 className="font-semibold text-lg">{item.name}</h3>
        <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
        <p className="text-md font-bold text-orange-600 mt-1">{formatCurrency(item.price)}</p>
      </div>
      <div className="flex items-center space-x-2 ml-4">
        <div className="flex items-center space-x-2">
          <Switch
            id={`item-active-${item.id}`}
            checked={item.is_active}
            onCheckedChange={handleToggleActive}
          />
          <Label htmlFor={`item-active-${item.id}`}>Ativo</Label>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(item)}>
              <Pencil className="h-4 w-4 mr-2" /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(item.id)} className="text-red-600">
              <Trash2 className="h-4 w-4 mr-2" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default MenuItemListItem;