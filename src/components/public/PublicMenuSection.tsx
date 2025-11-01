import React from 'react';
import { MenuCategory, MenuItem } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { formatPrice } from '@/lib/utils';
import { Utensils } from 'lucide-react';
import { DEFAULT_MENU_ITEM_IMAGE_URL } from '@/constants/assets';

interface PublicMenuSectionProps {
  categories: (MenuCategory & { items: MenuItem[] })[];
}

const PublicMenuSection: React.FC<PublicMenuSectionProps> = ({ categories }) => {
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
      <h2 className="text-xl font-bold text-[#022D68]">Cardápio</h2>
      {categories.map(category => (
        <section key={category.id} className="space-y-4">
          <h3 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2">{category.name}</h3>
          
          <div className="space-y-3">
            {category.items.length === 0 ? (
              <p className="text-gray-500 italic text-sm">Nenhum item ativo nesta categoria.</p>
            ) : (
              category.items.map(item => (
                <Card key={item.id} className="shadow-sm border-none rounded-xl">
                  <CardContent className="p-3 flex items-center gap-4">
                    <div 
                      className="w-16 h-16 bg-center bg-no-repeat aspect-square bg-cover rounded-lg flex-shrink-0" 
                      style={{ backgroundImage: `url("${item.image_url || DEFAULT_MENU_ITEM_IMAGE_URL}")` }}
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
    </div>
  );
};

export default PublicMenuSection;