import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Utensils, ChevronDown, ChevronUp } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  order_index: number;
}

interface MenuCategory {
  id: string;
  name: string;
  order_index: number;
  menu_items: MenuItem[];
}

interface MenuSectionProps {
  id: string; // Adicionando a prop 'id'
  restaurantId: string;
  menuCategories: MenuCategory[];
}

const MenuSection: React.FC<MenuSectionProps> = ({ id, menuCategories, restaurantId }) => {
  const [expandedCategories, setExpandedCategories] = React.useState<Record<string, boolean>>({});

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  if (menuCategories.length === 0) {
    return null;
  }

  return (
    <Card id={id} className="shadow-soft-md border-none rounded-xl p-0">
      <CardHeader className="flex flex-row items-center space-x-3 p-4 border-b border-gray-100">
        <Utensils className="w-6 h-6 text-primary" />
        <CardTitle className="text-2xl font-extrabold text-primary">Cardápio</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-6">
        {menuCategories
          .sort((a, b) => a.order_index - b.order_index)
          .map((category) => (
            <div key={category.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <h3 className="text-xl font-bold text-gray-800">{category.name}</h3>
                {expandedCategories[category.id] ? (
                  <ChevronUp className="w-5 h-5 text-primary" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-primary" />
                )}
              </button>

              {expandedCategories[category.id] && (
                <div className="p-4 space-y-4">
                  {category.menu_items
                    .sort((a, b) => a.order_index - b.order_index)
                    .map((item, itemIndex) => (
                      <React.Fragment key={item.id}>
                        <div className="flex items-start space-x-4">
                          {item.image_url && (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-16 h-16 object-cover rounded-md flex-shrink-0"
                            />
                          )}
                          <div className="flex-grow min-w-0">
                            <h4 className="text-lg font-semibold text-gray-900">{item.name}</h4>
                            {item.description && (
                              <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{item.description}</p>
                            )}
                            <p className="text-base font-bold text-primary mt-1">
                              {formatPrice(item.price)}
                            </p>
                          </div>
                        </div>
                        {itemIndex < category.menu_items.length - 1 && (
                          <Separator className="my-4 bg-gray-200" />
                        )}
                      </React.Fragment>
                    ))}
                  {category.menu_items.length === 0 && (
                    <p className="text-gray-500 text-sm italic">Nenhum item neste momento.</p>
                  )}
                </div>
              )}
            </div>
          ))}
      </CardContent>
    </Card>
  );
};

export default MenuSection;