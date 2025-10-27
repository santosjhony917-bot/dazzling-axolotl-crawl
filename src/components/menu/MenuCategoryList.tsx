import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MenuCategory } from "@/types/supabase";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import MenuItemList from "./MenuItemList";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MenuCategoryListProps {
  categories: MenuCategory[];
}

const MenuCategoryList: React.FC<MenuCategoryListProps> = ({ categories }) => {
  if (categories.length === 0) {
    return <p className="text-center text-gray-500 mt-8">Nenhuma categoria encontrada.</p>;
  }
  
  return (
    <Accordion type="single" collapsible className="w-full space-y-4">
      {categories.map((category) => (
        <AccordionItem key={category.id} value={category.id} className="border-none shadow-soft-md rounded-xl bg-white p-4">
          <AccordionTrigger className="flex justify-between items-center w-full text-lg font-bold text-primary hover:no-underline">
            {category.name}
            <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            {/* Placeholder para listagem de itens */}
            <div className="text-gray-600">Itens da categoria {category.name} serão listados aqui.</div>
            {/* <MenuItemList items={category.items} onEdit={() => {}} onDelete={() => {}} /> */}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
};

export default MenuCategoryList;