import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { usePublicRestaurantProfile } from "@/hooks/usePublicRestaurantProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, MapPin, Phone, Mail, Utensils, Clock, Link as LinkIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MenuCategory, Restaurant } from "@/types/supabase";
import MenuCategoryList from "@/components/menu/MenuCategoryList";
import { supabase } from "@/integrations/supabase/client";
import PublicRestaurantLayout from "@/components/PublicRestaurantLayout";

const RestaurantProfilePublic: React.FC = () => {
  // CORREÇÃO: Usar 'id' para corresponder à rota /restaurant-profile/:id
  const { id } = useParams<{ id: string }>();
  const restaurantId = id; // Usamos restaurantId internamente para manter a compatibilidade com hooks

  const { 
    restaurant, 
    isLoading: isLoadingProfile, 
    error: profileError,
    isPremium
  } = usePublicRestaurantProfile(restaurantId || "");

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);
  const [menuError, setMenuError] = useState<string | null>(null);

  useEffect(() => {
    if (!restaurantId) return;

    const fetchMenuCategories = async () => {
      setIsLoadingMenu(true);
      setMenuError(null);

      const { data, error } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true) // Only show active categories publicly
        .order('order_index', { ascending: true });

      if (error) {
        console.error("Error fetching menu categories:", error);
        setMenuError("Não foi possível carregar as categorias do cardápio.");
        setCategories([]);
      } else {
        setCategories(data as MenuCategory[]);
      }
      setIsLoadingMenu(false);
    };

    fetchMenuCategories();
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

  if (isLoadingProfile) {
    return (
      <div className="container mx-auto p-4 max-w-4xl space-y-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (profileError || !restaurant) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="h-10 w-10 mx-auto text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-red-600">Erro ao Carregar Perfil</h1>
        <p className="text-gray-600 mt-2">O perfil do restaurante não pôde ser encontrado ou ocorreu um erro: {profileError?.message || "Desconhecido"}</p>
      </div>
    );
  }

  const renderContactInfo = (icon: React.ReactNode, text: string | null | undefined, href?: string) => {
    if (!text) return null;
    return (
      <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm">
        {icon}
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="ml-2 hover:underline text-blue-600 dark:text-blue-400">
            {text}
          </a>
        ) : (
          <span className="ml-2">{text}</span>
        )}
      </div>
    );
  };

  return (
    <PublicRestaurantLayout restaurant={restaurant} title={restaurant.name}>
      <div className="p-4 space-y-6">
        <Card className="overflow-hidden">
          {/* Cover Image */}
          <div className="relative h-48 bg-gray-200 dark:bg-gray-700">
            {restaurant.cover_image_url ? (
              <img 
                src={restaurant.cover_image_url} 
                alt={`Capa de ${restaurant.name}`} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                Nenhuma imagem de capa
              </div>
            )}
          </div>

          <CardHeader className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-3xl font-extrabold text-gray-900 dark:text-white">
                  {restaurant.name}
                </CardTitle>
                <p className="text-sm font-medium text-primary mt-1">{restaurant.category}</p>
              </div>
              {isPremium && (
                <span className="text-xs font-bold text-white bg-yellow-500 px-3 py-1 rounded-full shadow-md">
                  Premium
                </span>
              )}
            </div>
            
            {restaurant.description && (
              <p className="text-gray-700 dark:text-gray-300 mt-3">{restaurant.description}</p>
            )}

            <div className="mt-4 space-y-2">
              {renderContactInfo(<MapPin className="h-4 w-4" />, `${restaurant.address}, ${restaurant.number} - ${restaurant.neighborhood}, ${restaurant.city} - ${restaurant.state}`)}
              {renderContactInfo(<Phone className="h-4 w-4" />, restaurant.phone, restaurant.phone ? `tel:${restaurant.phone}` : undefined)}
              {renderContactInfo(<Mail className="h-4 w-4" />, restaurant.email, restaurant.email ? `mailto:${restaurant.email}` : undefined)}
              {renderContactInfo(<LinkIcon className="h-4 w-4" />, "WhatsApp", restaurant.whatsapp_url)}
              {renderContactInfo(<LinkIcon className="h-4 w-4" />, "iFood", restaurant.ifood_url)}
              {renderContactInfo(<LinkIcon className="h-4 w-4" />, "Outro Link", restaurant.other_url)}
              
              {/* Opening Hours Placeholder */}
              {restaurant.opening_hours && (
                <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm">
                  <Clock className="h-4 w-4" />
                  <span className="ml-2">Horário de Funcionamento: (Detalhes)</span>
                </div>
              )}
            </div>
          </CardHeader>

          {/* Menu Section */}
          <Card className="mt-6 border-t rounded-t-none">
            <CardHeader className="flex flex-row items-center space-x-3 p-4 border-b">
              <Utensils className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              <CardTitle className="text-xl font-semibold">Cardápio</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {menuError ? (
                <div className="p-4 text-center text-red-500">
                  <AlertTriangle className="h-5 w-5 mx-auto mb-2" />
                  {menuError}
                </div>
              ) : (
                <MenuCategoryList 
                  categories={categories} 
                  isLoading={isLoadingMenu} 
                  isOwner={false} // Perfil público, não é o proprietário
                  restaurantId={restaurantId}
                />
              )}
            </CardContent>
          </Card>
        </Card>
      </div>
    </PublicRestaurantLayout>
  );
};

export default RestaurantProfilePublic;