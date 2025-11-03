"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AspectRatio } from '@/components/ui/aspect-ratio';

interface DishCardProps {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  categoryName?: string;
}

const DishCard: React.FC<DishCardProps> = ({ id, name, description, price, imageUrl, categoryName }) => {
  return (
    <Card className="w-full overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-0">
        {imageUrl && (
          <AspectRatio ratio={16 / 9}>
            <img src={imageUrl} alt={name} className="rounded-t-lg object-cover w-full h-full" />
          </AspectRatio>
        )}
        <div className="p-3">
          <h3 className="text-md font-semibold truncate">{name}</h3>
          {categoryName && <p className="text-xs text-gray-500 mt-1">{categoryName}</p>}
          {description && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{description}</p>}
          <p className="text-lg font-bold text-primary mt-2">R$ {price.toFixed(2)}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default DishCard;