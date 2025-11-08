import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils'; // Alterado de formatPrice para formatCurrency
import { Utensils } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url?: string;
}

interface MenuCategory {
  id: string;
  name: string;
  items: MenuItem[];
}

interface PublicMenuSectionProps {
  restaurantId: string;
  menu: MenuCategory[];
}

const PublicMenuSection: React.FC<PublicMenuSectionProps> = ({ restaurantId, menu }) => {
  if (!menu || menu.length === 0) {
    return null;
  }

  return (
    <Card className="w-full shadow-sm">
      <CardContent className="p-4">
        <h2 className="text-xl font-semibold mb-4">Cardápio</h2>
        {menu.map((category) => (
          <div key={category.id} className="mb-6">
            <h3 className="text-lg font-medium mb-3">{category.name}</h3>
            <div className="space-y-4">
              {category.items.map((item) => (
                <Link to={`/restaurants/${restaurantId}/menu/${item.id}`} key={item.id}>
                  <div className="flex items-center space-x-4">
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-16 h-16 object-cover flex-shrink-0 rounded-md"
                      />
                    )}
                    <div className="flex-grow">
                      <p className="font-medium text-base">{item.name}</p>
                      {item.description && (
                        <p className="text-sm text-gray-500 line-clamp-2">{item.description}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <p className="font-semibold text-orange-600 text-base">
                        {formatCurrency(item.price)}
                      </p>
                      <Utensils className="h-5 w-5 text-gray-400" /> {/* Changed to Utensils for consistency, assuming it's an icon for menu item */}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
        <Button asChild className="w-full mt-6 bg-orange-500 hover:bg-orange-600 text-white">
          <Link to={`/restaurants/${restaurantId}/menu`}>Ver Cardápio Completo</Link>
        </Button>
      </CardContent>
    </Card>
  );
};

export default PublicMenuSection;