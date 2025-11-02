import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  is_active: boolean;
  category_id: string;
  menu_categories: {
    is_active: boolean;
    is_popular: boolean;
  };
}

interface HighlightCardProps {
  item: MenuItem;
  onClick?: () => void;
}

const HighlightCard: React.FC<HighlightCardProps> = ({ item, onClick }) => {
  return (
    <Card
      className="relative w-full h-48 flex flex-col justify-end overflow-hidden rounded-lg shadow-lg cursor-pointer"
      onClick={onClick}
    >
      <img
        src={item.image_url || 'https://via.placeholder.com/300'}
        alt={item.name}
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Leve brilho de iluminação no topo */}
      <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/10 opacity-50" />
      <CardContent className="p-3 flex-1 relative z-10 bg-gradient-to-t from-black/70 to-transparent text-white flex flex-col justify-end">
        <p className="text-base font-extrabold leading-tight">{item.name}</p>
        <p className="text-sm mt-1">{item.description}</p>
        <p className="text-sm font-semibold mt-1">R$ {item.price.toFixed(2)}</p>
      </CardContent>
    </Card>
  );
};

export default HighlightCard;