import React from 'react';
import { useMenuCategories } from '@/hooks/useMenuCategories';
import Loading from '@/components/Loading';
import ErrorMessage from '@/components/ErrorMessage';
import { Card, CardContent } from '@/components/ui/card';
import { ListOrdered, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';

interface MenuCategoryListProps {
  restaurantId: string;
}

export default function MenuCategoryList({ restaurantId }: MenuCategoryListProps) {
  const navigate = useNavigate();
  const { categories, loading, error } = useMenuCategories(restaurantId);

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }
  
  if (!categories || categories.length === 0) {
    return (
      <Card className="p-6 text-center border-dashed border-2 border-gray-300 bg-white">
        <ListOrdered className="w-8 h-8 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">Nenhuma categoria de menu encontrada.</p>
        <p className="text-sm text-gray-500 mt-1">Comece adicionando sua primeira categoria acima.</p>
      </Card>
    );
  }

  return (
    <Card className="shadow-md border-none rounded-xl p-0">
      <h3 className="text-lg font-bold text-[#022D68] p-4 border-b">Categorias Existentes ({categories.length})</h3>
      <ul className="divide-y divide-gray-100">
        {categories.map((category) => (
          <li 
            key={category.id} 
            className="flex justify-between items-center p-4 hover:bg-gray-50 cursor-pointer transition-colors"
            onClick={() => navigate(createPageUrl(`restaurant-area/categories/${category.id}`))}
          >
            <div className="flex flex-col">
              <span className="font-medium text-gray-800">{category.name}</span>
              <span className="text-xs text-gray-500 mt-0.5">
                {category.is_active ? 'Ativa' : 'Inativa'} | Ordem: {category.order_index}
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </li>
        ))}
      </ul>
    </Card>
  );
}