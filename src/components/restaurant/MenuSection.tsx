import React, { useState, memo } from 'react';
import { Crown, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  isFavorite: boolean;
}

interface MenuSectionProps {
  categories: string[];
  menuItems: MenuItem[];
}

const MenuItemCard: React.FC<{ item: MenuItem }> = memo(({ item }) => (
  <div className="flex items-center gap-4 rounded-2xl bg-white p-3 shadow-none">
    <img className="size-20 rounded-lg object-cover" alt={item.name} src={item.imageUrl} />
    <div className="flex-1">
      <div className="flex justify-between items-start">
        <h3 className="font-bold text-primary">{item.name}</h3>
        {item.isFavorite && (
          <Star className="w-4 h-4 text-highlight fill-highlight" />
        )}
      </div>
      <p className="text-sm text-gray-700 mt-1 line-clamp-2">{item.description}</p>
      <div className="flex justify-between items-center mt-2">
        <p className="font-bold text-primary">{item.price != null ? `R$ ${item.price.toFixed(2).replace('.', ',')}` : 'Preço sob consulta'}</p>
        <Button variant="outline" className="rounded-full px-4 py-1 h-7 text-xs font-semibold border-highlight text-highlight hover:bg-highlight/5">Detalhes</Button>
      </div>
    </div>
  </div>
));

const MenuSection: React.FC<MenuSectionProps> = memo(({ categories, menuItems }) => {
  const [activeCategory, setActiveCategory] = useState(categories[0]);

  // Mock filtering logic (assuming all items belong to the first category for simplicity)
  const filteredItems = menuItems; 

  return (
    <div className="mt-8">
      {/* Premium Banner */}
      <div className="flex items-center gap-3 rounded-xl bg-[#EF2A39] p-4 shadow-none">
        <Crown className="w-7 h-7 text-white fill-white" />
        <p className="font-bold text-white">Cardápio Premium</p>
      </div>
      
      {/* Category Filters - Applying hide-scrollbar */}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2 whitespace-nowrap hide-scrollbar">
        {categories.map((category) => (
          <Button
            key={category}
            onClick={() => setActiveCategory(category)}
            variant={activeCategory === category ? 'default' : 'outline'}
            className={cn(
              "rounded-full px-4 py-2 h-9 text-sm font-semibold shrink-0",
              activeCategory === category 
                ? "bg-primary text-white hover:bg-primary/90" 
                : "bg-transparent text-primary border-primary hover:bg-primary/5"
            )}
          >
            {category}
          </Button>
        ))}
      </div>
      
      {/* Menu Items List */}
      <div className="mt-4 flex flex-col gap-4">
        {filteredItems.map((item) => (
          <MenuItemCard key={item.id} item={item} />
        ))}
      </div>
      
      <a className="mt-4 block text-center text-sm font-bold text-highlight hover:underline" href="#">Ver cardápio completo</a>
    </div>
  );
});

export default MenuSection;