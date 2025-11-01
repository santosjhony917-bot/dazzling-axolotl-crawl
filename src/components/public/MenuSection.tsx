"use client";

import { MenuCategory, MenuItem } from "@/types/supabase";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "../ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { Card, CardContent } from "../ui/card";
import { DollarSign, Heart } from "lucide-react";
import { Button } from "../ui/button";
import { MenuCategoryWithItems as MenuCategoryWithItemsType } from '@/types/supabase';

interface MenuSectionProps {
  restaurantId: string;
}

interface CategoryWithItems extends MenuCategoryWithItemsType {}

const fetchMenu = async (restaurantId: string): Promise<CategoryWithItems[]> => {
  const { data, error } = await supabase
    .from("menu_categories")
    .select(
      `
      *,
      menu_items (
        *
      )
    `
    )
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true)
    .order("order_index", { ascending: true })
    .order("order_index", { foreignTable: "menu_items", ascending: true });

  if (error) throw error;

  // Filter out categories with no active items
  return data.filter(category => category.menu_items && category.menu_items.length > 0) as CategoryWithItems[];
};

const MenuItemCard: React.FC<{ item: MenuItem }> = ({ item }) => (
  <Card className="flex overflow-hidden transition-shadow hover:shadow-lg">
    {item.image_url && (
      <div className="flex-shrink-0 w-24 h-24 md:w-32 md:h-32 bg-gray-100">
        <img
          src={item.image_url}
          alt={item.name}
          className="w-full h-full object-cover"
        />
      </div>
    )}
    <CardContent className="flex-grow p-3 md:p-4 flex flex-col justify-between">
      <div>
        <h3 className="text-base font-semibold text-gray-900">{item.name}</h3>
        {item.description && (
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.description}</p>
        )}
      </div>
      <div className="flex justify-between items-center mt-2">
        <p className="text-lg font-bold text-red-600 flex items-center">
          <DollarSign className="w-4 h-4 mr-1" />
          {item.price.toFixed(2).replace('.', ',')}
        </p>
        {/* Placeholder for favorite button */}
        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-500">
          <Heart className="w-5 h-5" />
        </Button>
      </div>
    </CardContent>
  </Card>
);

const MenuSection: React.FC<MenuSectionProps> = ({ restaurantId }) => {
  const { data: menu, isLoading } = useQuery<CategoryWithItems[]>({
    queryKey: ["restaurantMenu", restaurantId],
    queryFn: () => fetchMenu(restaurantId),
  });

  const [activeCategory, setActiveCategory] = useState<string | undefined>(undefined);

  React.useEffect(() => {
    if (menu && menu.length > 0 && !activeCategory) {
      setActiveCategory(menu[0].id);
    }
  }, [menu, activeCategory]);

  if (isLoading) {
    return (
      <section className="p-4 bg-white shadow-md rounded-lg">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Cardápio</h2>
        <Skeleton className="h-10 w-full mb-4" />
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </section>
    );
  }

  if (!menu || menu.length === 0) {
    return null;
  }

  return (
    <section className="p-4 bg-white shadow-md rounded-lg">
      <h2 className="text-lg font-semibold mb-4 text-gray-800">Cardápio</h2>
      
      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
        <TabsList className="w-full overflow-x-auto justify-start mb-4">
          {menu.map((category) => (
            <TabsTrigger key={category.id} value={category.id} className="flex-shrink-0">
              {category.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {menu.map((category) => (
          <TabsContent key={category.id} value={category.id} className="mt-0">
            <div className="space-y-4">
              {category.menu_items.map((item) => (
                <MenuItemCard key={item.id} item={item} />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
};

export default MenuSection;