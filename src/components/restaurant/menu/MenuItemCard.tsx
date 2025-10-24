import React, { memo } from 'react';
import { MenuItem } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Eye, EyeOff, Utensils } from 'lucide-react';
import { cn, formatPrice } from '@/lib/utils';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';

interface MenuItemCardProps {
  item: MenuItem;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}

const MenuItemCard: React.FC<MenuItemCardProps> = memo(({ item, onEdit, onDelete, onToggleActive }) => {
  return (
    <Card className="shadow-sm border-none rounded-xl">
      <CardContent className="p-3 flex items-center gap-4">
        
        {/* Imagem/Placeholder */}
        <div 
          className="w-16 h-16 bg-center bg-no-repeat aspect-square bg-cover rounded-lg flex-shrink-0 bg-gray-100 flex items-center justify-center" 
          style={{ backgroundImage: `url("${item.image_url || PLACEHOLDER_IMAGE_URL}")` }}
          data-alt={item.name}
        >
          {!item.image_url && <Utensils className="w-6 h-6 text-gray-400" />}
        </div>
        
        {/* Info */}
        <div className="flex-1 pr-2 min-w-0">
          <h4 className="text-base font-semibold text-gray-900 truncate">{item.name}</h4>
          <p className="text-xs text-gray-600 mt-0.5 line-clamp-1">{item.description || 'Sem descrição.'}</p>
          <p className="text-sm font-bold text-[#E47948] mt-1">
            {formatPrice(item.price)}
          </p>
        </div>
        
        {/* Ações */}
        <div className="flex items-center gap-1 shrink-0">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-gray-500 hover:bg-gray-100"
            onClick={onToggleActive}
          >
            {item.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-red-500" />}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-[#022D68] hover:bg-[#022D68]/10"
            onClick={onEdit}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-red-500 hover:bg-red-50"
            onClick={onDelete}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

export default MenuItemCard;