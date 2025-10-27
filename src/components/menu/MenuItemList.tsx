import React from "react";
import { MenuItem } from "@/types/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Utensils } from "lucide-react";
import { PLACEHOLDER_IMAGE_URL } from "@/constants/assets";

interface MenuItemListProps {
  items: MenuItem[];
  onEdit: (item: MenuItem) => void;
  onDelete: (itemId: string) => void;
}

export const MenuItemList: React.FC<MenuItemListProps> = ({ items, onEdit, onDelete }) => {
  if (items.length === 0) {
    return <p className="text-center text-gray-500 mt-8">Nenhum item de menu encontrado nesta categoria.</p>;
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.id} className="p-4 border rounded-lg">
          <p>{item.name}</p>
          {/* Placeholder para o item real */}
        </div>
      ))}
    </div>
  );
};

export default MenuItemList;