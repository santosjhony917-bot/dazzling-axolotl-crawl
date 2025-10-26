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
import FreeProfileLayout from "@/components/public/FreeProfileLayout"; // Layout Free existente
import PremiumProfileLayout from "@/components/public/PremiumProfileLayout"; // Novo Layout Premium

const RestaurantProfilePublic: React.FC = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>(); // CORRIGIDO: Lendo restaurantId
  // const restaurantId = id; // Removido, pois já está desestruturado

  const { 
    restaurant, 
    isLoading: isLoadingProfile, 
    error: profileError,
    isPremium,
    isFree,
  } = usePublicRestaurantProfile(restaurantId || "");

  // A lógica de menu categories não é mais necessária aqui, pois o PremiumProfileLayout
  // usa o hook useRestaurantMenu internamente, e o FreeProfileLayout é mais simples.

  const isLoading = isLoadingProfile;

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
  
  // Renderização Condicional
  if (isPremium) {
    // Se for Premium, usa o layout detalhado
    return (
      <PublicRestaurantLayout restaurant={restaurant} title={restaurant.name}>
        <PremiumProfileLayout restaurant={restaurant} />
      </PublicRestaurantLayout>
    );
  } else {
    // Se for Free, usa o layout simples (FreeProfileLayout)
    return (
      <PublicRestaurantLayout restaurant={restaurant} title={restaurant.name}>
        <FreeProfileLayout restaurant={restaurant as any} />
      </PublicRestaurantLayout>
    );
  }
};

export default RestaurantProfilePublic;