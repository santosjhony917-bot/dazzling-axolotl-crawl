import React from 'react';
import { MenuCategory, MenuItem } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { formatPrice } from '@/utils/formatters';
import { Utensils } from 'lucide-react';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';

interface PublicMenuSectionProps {
  categories: (MenuCategory & { menu_items: MenuItem[] })[];
  restaurantId: string;
}

const PublicMenuSection: React.FC<PublicMenuSectionProps> = ({ categories, restaurantId }) => {
  const navigate = useNavigate();

  if (categories.length === 0) {
    return (
      <div className="text-center p-6 bg-white rounded-xl shadow-sm">
        <Utensils className="w-8 h-8 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">Nenhum item ativo no cardápio.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {categories.map(category => (
        <section key={category.id} className="space-y-4">
          <h3 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2">{category.name}</h3>
          
          <div className="space-y-3">
            {category.menu_items.length === 0 ? (
              <p className="text-gray-500 italic text-sm">Nenhum item ativo nesta categoria.</p>
            ) : (
              category.menu_items.map(item => (
                <Card key={item.id} className="shadow-sm border-none rounded-xl">
                  <CardContent className="p-3 flex items-center gap-4">
                    <div 
                      className="w-16 h-16 bg-center bg-no-repeat aspect-square bg-cover rounded-lg flex-shrink-0" 
                      style={{ backgroundImage: `url("${item.image_url || PLACEHOLDER_IMAGE_URL}")` }}
                      data-alt={item.name}
                    />
                    <div className="flex-1 pr-4">
                      <h4 className="text-base font-semibold text-gray-900">{item.name}</h4>
                      {item.description && (
                        <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{item.description}</p>
                      )}
                      <p className="text-base font-bold text-[#E47948] mt-1">
                        {formatPrice(item.price)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </section>
      ))}
      <div className="mt-6 text-center">
        <Button onClick={() => navigate(createPageUrl('fullMenuPage', { restaurantId }))}>
          Ver Cardápio Completo
        </Button>
      </div>
    </div>
  );
};

export default PublicMenuSection;