import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category_id: string;
  order_index: number;
  is_active: boolean;
}

interface MenuCategory {
  id: string;
  name: string;
  items: MenuItem[];
}

interface FullMenuDisplayProps {
  menu: MenuCategory[];
  loading: boolean;
}

// Componente para exibir um único item do menu
const PublicMenuItemCard: React.FC<{ item: MenuItem }> = ({ item }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Define o limite de caracteres para truncamento
  const DESCRIPTION_LIMIT = 80; 
  const needsExpansion = item.description && item.description.length > DESCRIPTION_LIMIT;
  
  const displayDescription = needsExpansion && !isExpanded 
    ? `${item.description!.substring(0, DESCRIPTION_LIMIT)}...` 
    : item.description;

  return (
    <div className="flex items-start gap-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
      
      {/* Informações do Item */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-base text-[#022D68] truncate">{item.name}</h4>
        
        {/* Descrição e Botão Detalhes */}
        {item.description && (
          <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            <p className={isExpanded ? '' : 'line-clamp-2'}>
              {displayDescription}
            </p>
            
            {needsExpansion && (
              <Button 
                variant="link" 
                size="sm" 
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-0 h-auto text-xs font-medium text-highlight hover:text-highlight/80 mt-1"
              >
                {isExpanded ? 'Ver menos' : 'Detalhes'}
                {isExpanded ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
              </Button>
            )}
          </div>
        )}
        
        <p className="mt-1 font-bold text-base text-green-600">
          {formatCurrency(item.price)}
        </p>
      </div>

      {/* Imagem do Item (Reduzida) */}
      {item.image_url && (
        <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-200">
          <img 
            src={item.image_url} 
            alt={item.name} 
            className="w-full h-full object-cover"
          />
        </div>
      )}
    </div>
  );
};


const FullMenuDisplay: React.FC<FullMenuDisplayProps> = ({ menu, loading }) => {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-1/2 bg-gray-200 rounded"></div>
        <div className="h-16 w-full bg-gray-100 rounded"></div>
        <div className="h-16 w-full bg-gray-100 rounded"></div>
      </div>
    );
  }

  if (!menu || menu.length === 0) {
    return <p className="text-center text-gray-500 py-4">Nenhum item de menu disponível.</p>;
  }

  return (
    <div className="space-y-6">
      {menu.map(category => (
        <div key={category.id} className="space-y-2">
          <h3 className="text-lg font-bold text-[#022D68] border-b pb-1 border-gray-200 dark:border-gray-600">
            {category.name}
          </h3>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {(category.items || []).filter(item => item.is_active).map(item => (
              <PublicMenuItemCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default FullMenuDisplay;