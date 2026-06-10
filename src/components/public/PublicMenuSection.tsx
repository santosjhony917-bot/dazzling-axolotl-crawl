import React from 'react';
import { MenuCategory, MenuItem } from '@/types';
import { formatPrice } from '@/utils/formatters';
import { Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface PublicMenuSectionProps {
  categories: (MenuCategory & { menu_items: MenuItem[] })[];
  restaurantId: string;
}

const PublicMenuSection: React.FC<PublicMenuSectionProps> = ({ categories, restaurantId }) => {
  const navigate = useNavigate();

  // Filtrar categorias que tenham pelo menos um item ativo
  const activeCategories = categories.filter(category => category.menu_items && category.menu_items.length > 0);

  if (activeCategories.length === 0) {
    return (
      <div className="text-center p-6 bg-white rounded-2xl shadow-none border border-gray-100">
        <Utensils className="w-8 h-8 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">Nenhum item ativo no cardápio.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {activeCategories.map(category => (
        <section key={category.id} className="space-y-3">
          {/* Título da categoria simplificado */}
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider pb-1 border-b border-gray-200">
            {category.name}
          </h3>
          
          {/* Lista simples de itens sem imagens ou cards */}
          <div className="divide-y divide-gray-100 bg-white px-3 rounded-2xl border border-gray-100 shadow-none">
            {category.menu_items.map(item => (
              <div key={item.id} className="py-3 flex justify-between items-start gap-4">
                <div className="flex-grow min-w-0">
                  <h4 className="text-sm font-semibold text-gray-800">{item.name}</h4>
                  {item.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{item.description}</p>
                  )}
                </div>
                <div className="text-sm font-bold text-gray-600 shrink-0">
                  {formatPrice(item.price)}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
      
      {/* Botão de navegação simplificado como link sublinhado */}
      <div className="mt-4 text-center">
        <Button 
          variant="link" 
          onClick={() => navigate(`/restaurant/${restaurantId}/menu`)}
          className="text-gray-500 hover:text-gray-700 text-sm font-medium underline p-0 h-auto"
        >
          Ver Cardápio Completo
        </Button>
      </div>
    </div>
  );
};

export default PublicMenuSection;