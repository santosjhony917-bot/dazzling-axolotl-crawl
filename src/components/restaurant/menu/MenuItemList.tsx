"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MenuItemListItem } from "./MenuItemListItem";
import { useToast } from "@/components/ui/use-toast";

interface MenuItemListProps {
  categoryId: string;
  restaurantId: string;
  onEdit: (item: any) => void; // Mantendo a prop aqui caso seja usada em outro lugar no MenuItemList
  onItemUpdated: () => void;
}

export function MenuItemList({ categoryId, restaurantId, onEdit, onItemUpdated }: MenuItemListProps) {
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchMenuItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .eq("category_id", categoryId)
      .order("order_index", { ascending: true });

    if (error) {
      toast({
        title: "Erro ao carregar itens do menu",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setMenuItems(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMenuItems();
  }, [categoryId]);

  const handleDeleteMenuItem = async (itemId: string) => {
    // A lógica de exclusão já está no MenuItemListItem,
    // esta função aqui é apenas para acionar o re-fetch após a exclusão.
    await fetchMenuItems();
    onItemUpdated(); // Notifica o pai que algo foi atualizado (incluindo exclusão)
  };

  if (loading) {
    return <div>Carregando itens do menu...</div>;
  }

  return (
    <div className="space-y-4">
      {menuItems.length === 0 ? (
        <p className="text-center text-gray-500">Nenhum item de menu nesta categoria.</p>
      ) : (
        menuItems.map((item) => (
          <MenuItemListItem
            key={item.id}
            item={item}
            onUpdate={onItemUpdated} // Callback para quando um item é atualizado
            onDelete={handleDeleteMenuItem} // Callback para quando um item é deletado
            // As props 'onEdit' e 'restaurantId' foram removidas daqui
            // pois não são esperadas pelo MenuItemListItem e não são usadas internamente por ele.
          />
        ))
      )}
    </div>
  );
}