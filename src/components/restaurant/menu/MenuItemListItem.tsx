import React from 'react';
import { MenuItem } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, DollarSign, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useMenuItemManagement } from '@/hooks/useMenuManagement';

interface MenuItemListItemProps {
  item: MenuItem;
  onEdit: (item: MenuItem) => void;
  onDelete: (itemId: string) => void;
}

export const MenuItemListItem: React.FC<MenuItemListItemProps> = ({ item, onEdit, onDelete }) => {
  // Assumindo que o item tem category_id para usar o hook de mutação
  const { updateItemMutation } = useMenuItemManagement(item.category_id);
  const isUpdating = updateItemMutation.isPending;

  const handleToggleActive = (checked: boolean) => {
    updateItemMutation.mutate({
      id: item.id,
      name: item.name,
      description: item.description || '',
      price: item.price,
      image_url: item.image_url,
      is_active: checked,
    });
  };

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4 flex-grow">
          {item.image_url && (
            <img src={item.image_url} alt={item.name} className="w-16 h-16 object-cover rounded-md" />
          )}
          <div>
            <h3 className="text-lg font-semibold">{item.name}</h3>
            <p className="text-sm text-gray-500 line-clamp-1">{item.description}</p>
            <div className="flex items-center text-primary font-medium mt-1">
              <DollarSign className="w-4 h-4 mr-1" />
              {item.price.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="flex space-x-4 items-center">
          <div className="flex items-center space-x-2">
            <Switch
              id={`item-active-switch-${item.id}`}
              checked={item.is_active}
              onCheckedChange={handleToggleActive}
              disabled={isUpdating}
            />
            <Label htmlFor={`item-active-switch-${item.id}`} className="text-sm text-gray-500">
              {item.is_active ? 'Ativo' : 'Inativo'}
            </Label>
            {isUpdating && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          </div>

          <Button variant="outline" size="icon" onClick={() => onEdit(item)} title="Editar Item">
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="destructive" size="icon" onClick={() => onDelete(item.id)} title="Deletar Item">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};