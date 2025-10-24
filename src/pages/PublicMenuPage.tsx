import React from 'react';
import { useParams } from 'react-router-dom';
import FreeProfileLayout from '@/components/FreeProfileLayout';
import { usePublicMenu } from '@/hooks/usePublicMenu';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPrice } from '@/lib/utils';

const PublicMenuPage: React.FC = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();

  const { data, isLoading, isError } = usePublicMenu(restaurantId || '');

  if (!restaurantId) {
    return (
      <FreeProfileLayout>
        <div className="p-4 text-center text-red-500">ID do Restaurante não fornecido.</div>
      </FreeProfileLayout>
    );
  }

  if (isLoading) {
    return (
      <FreeProfileLayout>
        <div className="p-4 space-y-6">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-40 w-full" />
        </div>
      </FreeProfileLayout>
    );
  }

  if (isError || !data) {
    return (
      <FreeProfileLayout>
        <div className="p-4 text-center text-red-500">Erro ao carregar o cardápio.</div>
      </FreeProfileLayout>
    );
  }

  const { categories } = data;

  return (
    <FreeProfileLayout>
      <div className="p-4 space-y-8">
        {categories.length === 0 ? (
          <div className="text-center text-gray-500 mt-10">
            Nenhum item ativo no cardápio.
          </div>
        ) : (
          categories.map(category => (
            <section key={category.id} className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">{category.name}</h2>
              
              <div className="space-y-4">
                {category.items.length === 0 ? (
                  <p className="text-gray-500 italic">Nenhum item ativo nesta categoria.</p>
                ) : (
                  category.items.map(item => (
                    <Card key={item.id} className="shadow-sm">
                      <CardContent className="p-4 flex justify-between items-start">
                        <div className="flex-1 pr-4">
                          <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                          {item.description && (
                            <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                          )}
                          <p className="text-lg font-bold text-green-600 mt-2">
                            {formatPrice(item.price)}
                          </p>
                        </div>
                        {item.image_url && (
                          <img 
                            src={item.image_url} 
                            alt={item.name} 
                            className="w-16 h-16 object-cover rounded-md flex-shrink-0"
                          />
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </section>
          ))
        )}
      </div>
    </FreeProfileLayout>
  );
};

export default PublicMenuPage;