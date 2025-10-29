import React from 'react';
import { MenuItem } from '@/types/menu';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, DollarSign, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useUpdateMenuItem } from '@/hooks/useMenuManagement'; // Corrected import
import { formatPrice } from '@/lib/utils';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';

interface MenuItemListItemProps {
  item: MenuItem;
  onEdit: (item: MenuItem) => void;
  onDelete: (itemId: string) => void;
}

export const MenuItemListItem: React.FC<MenuItemListItemProps> = ({ item, onEdit, onDelete }) => {
  // Assumindo que o item tem category_id para usar o hook de mutação
  // Nota: O hook useMenuItemManagement agora retorna as mutações individualmente.
  // Para usar a mutação de update, precisamos importá-la individualmente ou refatorar o componente.
  // Vamos importar a mutação individualmente para manter a simplicidade do componente.
  
  // CORREÇÃO: Importando useUpdateMenuItem do novo arquivo
  const updateItemMutation = useUpdateMenuItem();
  const isUpdating = updateItemMutation.isPending;

  const handleToggleActive = (checked: boolean) => {
    updateItemMutation.mutate({
      id: item.id,
      updates: {
        name: item.name,
        description: item.description || '',
        price: item.price,
        image_url: item.image_url,
        is_active: checked,
      }
    });
  };

  return (
    <Card className="shadow-soft-md hover:shadow-soft-lg transition-shadow border-none rounded-xl">
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4 flex-grow">
          <img 
            src={item.image_url || PLACEHOLDER_IMAGE_URL} 
            alt={item.name} 
            className="w-16 h-16 object-cover rounded-lg flex-shrink-0 shadow-soft-sm"
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-primary truncate">{item.name}</h3>
            <p className="text-sm text-gray-500 line-clamp-1">{item.description}</p>
            <div className="flex items-center text-primary font-medium mt-1">
              <DollarSign className="w-4 h-4 mr-1 text-highlight" />
              <span className="font-bold text-highlight">{formatPrice(item.price)}</span>
            </div>
          </div>
        </div>

        <div className="flex space-x-4 items-center flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Switch
              id={`item-active-switch-${item.id}`}
              checked={item.is_active}
              onCheckedChange={handleToggleActive}
              disabled={isUpdating}
              className="data-[state=checked]:bg-highlight"
            />
            <Label htmlFor={`item-active-switch-${item.id}`} className="text-sm text-gray-500">
              {item.is_active ? 'Ativo' : 'Inativo'}
            </Label>
            {isUpdating && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          </div>

          <Button variant="outline" size="icon" onClick={() => onEdit(item)} title="Editar Item" className="h-8 w-8 text-blue-500 hover:bg-blue-50">
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="destructive" size="icon" onClick={() => onDelete(item.id)} title="Deletar Item" className="h-8 w-8 bg-red-600 hover:bg-red-700">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};