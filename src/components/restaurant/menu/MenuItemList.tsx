"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MenuItemListItem } from "./MenuItemListItem";
import { useToast } from "@/components/ui/use-toast";

export function MenuItemList({ categoryId, restaurantId }) {
  const [menuItems, setMenuItems] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    const fetchMenuItems = async () => {
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
        setMenuItems(data);
      }
    };

    fetchMenuItems();
  }, [categoryId, toast]);

  const handleUpdateMenuItem = (updatedItem) => {
    setMenuItems((prevItems) =>
      prevItems.map((item) => (item.id === updatedItem.id ? updatedItem : item))
    );
  };

  const handleDeleteMenuItem = (deletedItemId) => {
    setMenuItems((prevItems) =>
      prevItems.filter((item) => item.id !== deletedItemId)
    );
  };

  return (
    <div className="space-y-4">
      {menuItems.map((item) => (
        <MenuItemListItem
          key={item.id}
          item={item}
          onUpdate={handleUpdateMenuItem}
          onDelete={handleDeleteMenuItem}
        />
      ))}
    </div>
  );
}