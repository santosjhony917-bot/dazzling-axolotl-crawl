import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';

interface MenuItem {
  item_id: string;
  item_name: string;
  item_price: number;
  item_image_url?: string;
  restaurant_id: string;
  restaurant_name: string;
}

interface MenuItemCardProps {
  item: MenuItem;
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({ item }) => {
  const formattedPrice = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(item.item_price);

  return (
    <Link to={`/restaurant/${item.restaurant_id}`} className="block">
      <Card className="flex items-center p-3 space-x-4 hover:bg-gray-50 transition-colors dark:hover:bg-gray-800">
        <img
          src={item.item_image_url || 'https://via.placeholder.com/80'}
          alt={item.item_name}
          className="w-20 h-20 rounded-md object-cover"
        />
        <div className="flex-1">
          <h3 className="font-semibold text-md">{item.item_name}</h3>
          <p className="text-sm text-muted-foreground">em {item.restaurant_name}</p>
          <p className="font-semibold text-md text-green-600 mt-1">{formattedPrice}</p>
        </div>
      </Card>
    </Link>
  );
};

export default MenuItemCard;