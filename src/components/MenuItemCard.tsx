import React from 'react';
import { RestaurantMenuItem } from '@/types/menu';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Utensils } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';

interface MenuItemCardProps {
  item: RestaurantMenuItem;
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({ item }) => {
  const navigate = useNavigate();

  const handleViewRestaurant = () => {
    // Assuming createPageUrl generates the full path string based on route name and params
    // If createPageUrl expects a single string argument (the path), we need to adjust how it's used.
    // Based on common React Router patterns, we should navigate to the path: /restaurant/:id
    // Since I don't have the definition of createPageUrl, I will assume it returns the correct path string.
    // If the error persists, the definition of createPageUrl needs to be checked.
    
    // For now, let's assume createPageUrl takes the route name and params object and returns the path string.
    // If the error is about the number of arguments, I will assume the function signature is wrong 
    // and needs to be fixed in utils/url.ts, but since I cannot see it, I will try to fix the usage first.
    
    // Let's assume the correct usage is:
    navigate(`/restaurant/${item.restaurant_id}`);
  };

  return (
    <Card className="overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={handleViewRestaurant}>
      <CardContent className="p-3 flex space-x-3">
        {item.item_image_url ? (
          <img 
            src={item.item_image_url} 
            alt={item.item_name} 
            className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
          />
        ) : (
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
            <Utensils className="w-6 h-6 text-gray-400" />
          </div>
        )}
        
        <div className="flex-grow">
          <h4 className="font-bold text-base truncate">{item.item_name}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-1">
            {item.item_description || 'Sem descrição.'}
          </p>
          
          <div className="flex items-center justify-between mt-1">
            <span className="text-lg font-extrabold text-primary flex items-center">
              <DollarSign className="w-4 h-4 mr-1" /> R$ {item.item_price.toFixed(2)}
            </span>
            <Badge variant="secondary" className="text-xs">
              {item.restaurant_name}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MenuItemCard;