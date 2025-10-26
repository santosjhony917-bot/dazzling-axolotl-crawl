"use client";

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Edit, Trash2, Plus, GripVertical } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { MenuCategory, MenuItem } from '@/types/restaurant';
import { cn } from '@/lib/utils';

interface CategoryItemManagerProps {
  category: MenuCategory;
  items: MenuItem[];
  onEditCategory: (category: MenuCategory) => void;
  onDeleteCategory: (categoryId: string) => void;
  onAddItem: (categoryId: string) => void;
  onEditItem: (item: MenuItem) => void;
  onDeleteItem: (itemId: string) => void;
  onReorder: (categoryId: string, direction: 'up' | 'down') => void;
}

const CategoryItemManager: React.FC<CategoryItemManagerProps> = ({
  category,
  items,
  onEditCategory,
  onDeleteCategory,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onReorder,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const activeItems = items.filter(item => item.is_active);
  const inactiveItems = items.filter(item => !item.is_active);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="space-y-2 border rounded-lg bg-white shadow-sm"
    >
      {/* Category Header (Trigger) */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-3">
          <GripVertical className="h-5 w-5 text-gray-400 cursor-grab" />
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-start w-full text-left font-semibold text-lg hover:text-primary transition-colors">
              {category.name} ({items.length} itens)
              {isOpen ? <ChevronUp className="ml-2 h-5 w-5" /> : <ChevronDown className="ml-2 h-5 w-5" />}
            </button>
          </CollapsibleTrigger>
        </div>

        {/* Category Actions */}
        <div className="flex space-x-2">
          <Button variant="outline" size="icon" onClick={() => onReorder(category.id, 'up')} title="Mover para cima">
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => onReorder(category.id, 'down')} title="Mover para baixo">
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => onEditCategory(category)} title="Editar Categoria">
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="destructive" size="icon" onClick={() => onDeleteCategory(category.id)} title="Excluir Categoria">
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button size="icon" onClick={() => onAddItem(category.id)} title="Adicionar Item">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Collapsible Content (Menu Items) */}
      <CollapsibleContent className="space-y-4 p-4 pt-0">
        {items.length === 0 ? (
          <p className="text-gray-500 italic text-sm">Nenhum item nesta categoria.</p>
        ) : (
          <div className="space-y-3">
            {/* Active Items */}
            {activeItems.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-center justify-between p-3 border rounded-md transition-all",
                  item.is_active ? "bg-gray-50 hover:bg-gray-100" : "bg-red-50 opacity-70"
                )}
              >
                <div className="flex items-center space-x-3">
                  <GripVertical className="h-4 w-4 text-gray-400 cursor-grab" />
                  <div className="flex flex-col">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-sm text-gray-600">R$ {item.price.toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => onEditItem(item)} title="Editar Item">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDeleteItem(item.id)} title="Excluir Item">
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Inactive Items (Optional Section) */}
            {inactiveItems.length > 0 && (
              <div className="mt-4 pt-4 border-t border-dashed">
                <h4 className="text-sm font-semibold text-gray-500 mb-2">Itens Inativos ({inactiveItems.length})</h4>
                {inactiveItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 border rounded-md bg-red-50 opacity-70 mt-2"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium line-through text-gray-500">{item.name}</span>
                      <span className="text-sm text-gray-400">R$ {item.price.toFixed(2)}</span>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => onEditItem(item)} title="Editar Item">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onDeleteItem(item.id)} title="Excluir Item">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};

export default CategoryItemManager;