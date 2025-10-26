import React from 'react';
import { Restaurant } from '@/types';
import { useMenuManagement } from '@/hooks/useMenuManagement';
import { Skeleton } from '@/components/ui/skeleton';

interface FreeProfileLayoutProps {
  restaurant: Restaurant;
}

export default function FreeProfileLayout({ restaurant }: FreeProfileLayoutProps) {
  // O hook useMenuManagement retorna { categoriesQuery, deleteCategoryMutation }
  const { categoriesQuery } = useMenuManagement(restaurant.id); 
  
  const categories = categoriesQuery.data || [];
  const isMenuLoading = categoriesQuery.isLoading;

  if (isMenuLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-4">{restaurant.name}</h1>
      
      {categories.length > 0 ? (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Menu</h2>
          {categories.map(category => (
            <div key={category.id} className="border p-4 rounded-lg">
              <h3 className="text-lg font-medium mb-2">{category.name}</h3>
              {/* Aqui você listaria os itens do menu, que não estão sendo buscados neste hook */}
              <p className="text-gray-500">Itens de menu virão aqui...</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">Nenhum item de menu disponível.</p>
      )}
    </div>
  );
}