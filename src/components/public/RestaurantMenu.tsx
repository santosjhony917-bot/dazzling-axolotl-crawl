"use client";

import React from 'react';

interface RestaurantMenuProps {
  restaurantId: string; // Apenas para satisfazer o tipo, a lógica de fetch virá depois
  menuCategories: any[]; // Temporário, será tipado corretamente depois
  isFullMenuPage?: boolean; // Adicionado para resolver o erro de tipo
}

const RestaurantMenu: React.FC<RestaurantMenuProps> = ({ restaurantId, menuCategories }) => {
  // Lógica para buscar e exibir o cardápio virá aqui
  return (
    <div className="py-4">
      <h2 className="text-xl font-bold text-primary mb-4">Cardápio</h2>
      {menuCategories.length === 0 ? (
        <p className="text-muted-foreground">Nenhum item de cardápio disponível no momento.</p>
      ) : (
        // Renderizar categorias e itens do menu aqui
        <div>
          {menuCategories.map((category) => (
            <div key={category.id} className="mb-4">
              <h3 className="text-lg font-semibold">{category.name}</h3>
              {category.menu_items.map((item: any) => (
                <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-100">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  <p className="font-semibold">R$ {item.price.toFixed(2)}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RestaurantMenu;