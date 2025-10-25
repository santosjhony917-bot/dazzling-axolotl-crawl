import React from "react";
import { MenuItem } from "@/types/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle } from "lucide-react";

interface MenuItemListProps {
  categoryId: string;
  isOwner: boolean;
  isPremium: boolean;
}

// Placeholder para buscar itens de menu (a ser implementado com um hook real)
const useMenuItems = (categoryId: string) => {
  // Retorna uma estrutura básica para satisfazer os tipos
  const items: MenuItem[] = []; 
  const isLoading = false;
  const error = null;
  return { items, isLoading, error };
};

const MenuItemList: React.FC<MenuItemListProps> = ({
  categoryId,
  isOwner,
  isPremium,
}) => {
  // Em um cenário real, buscaríamos os itens aqui ou receberíamos como props.
  const { items, isLoading, error } = useMenuItems(categoryId);

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500 flex items-center justify-center space-x-2">
        <AlertTriangle className="h-5 w-5" />
        <span>Erro ao carregar itens do menu.</span>
      </div>
    );
  }

  const activeItems = isOwner ? items : items.filter(item => item.is_active);

  if (activeItems.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        {isOwner ? "Nenhum item neste menu. Adicione um novo item." : "Nenhum item disponível nesta categoria."}
      </div>
    );
  }

  return (
    <div>
      {activeItems.map((item) => (
        <div key={item.id} className="p-4 flex justify-between items-start hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <div className="flex-1 pr-4">
            <h4 className="font-medium text-gray-900 dark:text-white">{item.name}</h4>
            {item.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{item.description}</p>
            )}
            <p className="text-base font-semibold text-green-600 dark:text-green-400 mt-1">
              R$ {item.price.toFixed(2)}
            </p>
          </div>
          {item.image_url && (
            <img 
              src={item.image_url} 
              alt={item.name} 
              className="w-16 h-16 object-cover rounded-md flex-shrink-0"
            />
          )}
        </div>
      ))}
      {isOwner && (
        <div className="p-4 border-t">
          {/* Botão para adicionar item para o proprietário */}
        </div>
      )}
      {!isPremium && !isOwner && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-sm text-center">
          Assine o plano Premium para ver mais detalhes do cardápio.
        </div>
      )}
    </div>
  );
};

export default MenuItemList;