import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MenuCategory, MenuItem } from "@/types/supabase";
import MenuCategoryList from "@/components/menu/MenuCategoryList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Utensils } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { usePublicRestaurantProfile } from "@/hooks/usePublicRestaurantProfile";

const PublicMenuPage: React.FC = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { restaurant, isLoading: isLoadingProfile } = usePublicRestaurantProfile(restaurantId || "");

  useEffect(() => {
    if (!restaurantId) {
      setError("ID do restaurante não fornecido.");
      setIsLoadingMenu(false);
      return;
    }

    const fetchMenu = async () => {
      setIsLoadingMenu(true);
      setError(null);

      const { data: categoryData, error: categoryError } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true) // Only show active categories publicly
        .order('order_index', { ascending: true });

      if (categoryError) {
        console.error("Error fetching menu categories:", categoryError);
        setError("Não foi possível carregar o cardápio.");
        setCategories([]);
      } else {
        setCategories(categoryData as MenuCategory[]);
      }
      setIsLoadingMenu(false);
    };

    fetchMenu();
  }, [restaurantId]);

  const isLoading = isLoadingProfile || isLoadingMenu;

  if (!restaurantId) {
    return (
      <div className="p-4 text-center">
        <AlertTriangle className="h-6 w-6 mx-auto text-red-500 mb-2" />
        <p className="text-lg text-red-500">ID do restaurante inválido.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 max-w-3xl">
        <Skeleton className="h-8 w-3/4 mb-4" />
        <Skeleton className="h-4 w-1/2 mb-8" />
        <Skeleton className="h-12 w-full mb-4" />
        <Skeleton className="h-12 w-full mb-4" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <AlertTriangle className="h-6 w-6 mx-auto text-red-500 mb-2" />
        <p className="text-lg text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center">
            <Utensils className="h-6 w-6 mr-3 text-primary" />
            Cardápio de {restaurant?.name || "Restaurante"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <MenuCategoryList 
            categories={categories} 
            isLoading={isLoadingMenu} 
            isOwner={false} // Página pública
            restaurantId={restaurantId}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default PublicMenuPage;