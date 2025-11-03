"use client";

import React from 'react';
import { PublicMenuCategory } from '@/types/menu';
import MenuItemCard from './MenuItemCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface RestaurantMenuProps {
  menuCategories: PublicMenuCategory[];
  isFullMenuPage?: boolean;
  restaurantId: string;
}

const RestaurantMenu: React.FC<RestaurantMenuProps> = ({ menuCategories, isFullMenuPage = false, restaurantId }) => {
  if (!menuCategories || menuCategories.length === 0) {
    return null;
  }

  const activeCategories = menuCategories.filter(category => category.is_active);

  if (activeCategories.length === 0) {
    return null;
  }

  return (
    <Card className="shadow-sm border border-gray-200 rounded-lg p-0"> {/* Estilo de card mais simples */}
      <CardHeader className="p-4 border-b border-gray-100">
        <CardTitle className="text-xl font-bold text-gray-800">Cardápio</CardTitle> {/* Tipografia mais genérica */}
      </CardHeader>
      <CardContent className="p-0">
        <Accordion type="single" collapsible className="w-full">
          {activeCategories.map((category) => (
            <AccordionItem key={category.id} value={category.id} className="border-b border-gray-100">
              <AccordionTrigger className="px-4 py-3 text-lg font-semibold text-gray-900 hover:no-underline"> {/* Tipografia mais genérica */}
                {category.name}
              </AccordionTrigger>
              <AccordionContent className="p-4 space-y-4">
                {category.menu_items && category.menu_items.filter(item => item.is_active).map((item) => (
                  <MenuItemCard key={item.id} item={item} isPremium={false} />
                ))}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        {!isFullMenuPage && (
          <div className="p-4 border-t border-gray-100">
            <Button asChild variant="outline" className="w-full"> {/* Botão de outline mais genérico */}
              <Link to={`/restaurant/${restaurantId}/menu`}>Ver Cardápio Completo</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RestaurantMenu;