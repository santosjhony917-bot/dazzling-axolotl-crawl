import React from 'react';
import { MenuItem } from '@/types/restaurant';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';

interface MenuItemCardProps {
  item: MenuItem;
  onEdit: (item: MenuItem) => void;
  onDelete: (itemId: string) => void;
  onToggleActive: (item: MenuItem) => void;
  isDeleting: boolean;
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({ item, onEdit, onDelete, onToggleActive, isDeleting }) => {
  const formattedPrice = `R$ ${item.price.toFixed(2).replace('.', ',')}`;
  const imageUrl = item.image_url || PLACEHOLDER_IMAGE_URL;

  return (
    <Card className="shadow-sm rounded-xl border-none hover:shadow-md transition-shadow">
      <CardContent className="p-3 flex items-center gap-4">
        <div 
          className="w-16 h-16 bg-center bg-no-repeat aspect-square bg-cover rounded-lg flex-shrink-0" 
          style={{ backgroundImage: `url("${imageUrl}")` }}
          data-alt={item.name}
        />
        
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-primary truncate">{item.name}</h3>
          <p className="text-sm font-semibold text-highlight mt-0.5">{formattedPrice}</p>
          <p className="text-xs text-gray-500 truncate mt-1">{item.description || 'Sem descrição.'}</p>
        </div>
        
        <div className="flex flex-col gap-1 shrink-0">
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={() => onEdit(item)}
            className="h-8 w-8 text-primary hover:bg-primary/10"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={() => onToggleActive(item)}
            className={cn("h-8 w-8", item.is_active ? "text-green-600 hover:bg-green-50" : "text-red-600 hover:bg-red-50")}
          >
            {item.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </Button>
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={() => onDelete(item.id)}
            disabled={isDeleting}
            className="h-8 w-8 text-destructive hover:bg-destructive/10"
          >
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MenuItemCard;