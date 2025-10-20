import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Clock, CreditCard, Home, Search, Heart, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createPageUrl } from "@/utils/url";
import RestaurantPublicHeader from "@/components/restaurant/RestaurantPublicHeader";
import PublicMenuItemCard from "@/components/restaurant/PublicMenuItemCard";
import CustomerBottomNav from "@/components/CustomerBottomNav"; // Reutilizando o nav de cliente

// Mock Data
const mockRestaurantData = {
  id: 'nau',
  name: 'Cachorro Quente do Zé',
  followersCount: 120,
  logoUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070&auto=format&fit=crop",
  coverImageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
  address: 'Rua das Flores, 123 Centro, João Pessoa/PB',
  openingHours: 'Qua-Dom: 11h às 23h',
  paymentMethods: 'Dinheiro, Pix, Cartão de Crédito',
  categories: ['Pizzas', 'Sobremesas', 'Bebidas'],
  menuItems: [
    { id: '1', name: 'Pizza Calabresa', price: 39.90, imageUrl: 'https://images.unsplash.com/photo-1592417817098-8fd3d9eb14a5?q=80&w=2070&auto=format&fit=crop' },
    { id: '2', name: 'Pizza Pepperoni', price: 42.50, imageUrl: 'https://images.unsplash.com/photo-1592417817098-8fd3d9eb14a5?q=80&w=2070&auto=format&fit=crop' },
    { id: '3', name: 'Frango c/ Catupiry', price: 41.00, imageUrl: 'https://images.unsplash.com/photo-1592417817098-8fd3d9eb14a5?q=80&w=2070&auto=format&fit=crop' },
    { id: '4', name: 'Pudim de Leite', price: 12.00, imageUrl: 'https://images.unsplash.com/photo-1592417817098-8fd3d9eb14a5?q=80&w=2070&auto=format&fit=crop' },
    { id: '5', name: 'Mousse de Maracujá', price: 10.50, imageUrl: 'https://images.unsplash.com/photo-1592417817098-8fd3d9eb14a5?q=80&w=2070&auto=format&fit=crop' },
    { id: '6', name: 'Refrigerante Lata', price: 5.00, imageUrl: 'https://images.unsplash.com/photo-1592417817098-8fd3d9eb14a5?q=80&w=2070&auto=format&fit=crop' },
    { id: '7', name: 'Suco Natural 500ml', price: 8.00, imageUrl: 'https://images.unsplash.com/photo-1592417817098-8fd3d9eb14a5?q=80&w=2070&auto=format&fit=crop' },
  ],
};

export default function RestaurantProfilePublic() {
  const navigate = useNavigate();
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeCategory, setActiveCategory] = useState(mockRestaurantData.categories[0]);

  const handleFollowToggle = () => {
    setIsFollowing(prev => !prev);
  };

  // Filtra itens do menu (mock: retorna todos por enquanto)
  const filteredMenuItems = mockRestaurantData.menuItems;

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display max-w-md mx-auto">
      
      {/* Header (Apenas para navegação) */}
      <div className="sticky top-0 z-10 bg-white dark:bg-background-dark shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full text-primary hover:bg-primary/5"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-10"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative pb-24">
        
        {/* Restaurant Header (Logo, Nome, Ações) */}
        <RestaurantPublicHeader 
          restaurant={{
            ...mockRestaurantData,
            isFollowing,
            onFollowToggle: handleFollowToggle,
            logoUrl: mockRestaurantData.logoUrl, // Usando a URL mockada
            followersCount: mockRestaurantData.followersCount,
          }}
        />

        {/* Menu Section */}
        <h2 className="text-[#111418] dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">Cardápio</h2>
        
        {/* Category Tabs */}
        <div className="pb-3">
          <div className="flex border-b border-[#dbe0e6] dark:border-gray-700 px-4 gap-8 overflow-x-auto hide-scrollbar">
            {mockRestaurantData.categories.map((category) => {
              const isActive = activeCategory === category;
              return (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={cn(
                    "flex flex-col items-center justify-center pb-[13px] pt-4 shrink-0 transition-colors duration-200",
                    isActive
                      ? "border-b-[3px] border-b-primary text-primary"
                      : "border-b-[3px] border-b-transparent text-[#5f728c] dark:text-gray-400 hover:text-primary"
                  )}
                >
                  <p className="text-sm font-bold leading-normal tracking-[0.015em]">{category}</p>
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Menu Items List */}
        <div className="flex flex-col gap-4 p-4">
          {filteredMenuItems.map((item) => (
            <PublicMenuItemCard key={item.id} item={item} />
          ))}
        </div>

        {/* Informações */}
        <h2 className="text-[#111418] dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">Informações</h2>
        <div className="flex flex-col gap-4 px-4 pb-24">
          
          {/* Endereço */}
          <div className="flex items-start gap-4">
            <div className="text-primary flex size-7 items-center justify-center mt-1">
              <MapPin />
            </div>
            <div className="flex flex-col">
              <p className="text-[#111418] dark:text-white text-base font-bold">Endereço</p>
              <p className="text-[#5f728c] dark:text-gray-400 text-base">{mockRestaurantData.address}</p>
            </div>
          </div>
          
          {/* Horários */}
          <div className="flex items-start gap-4">
            <div className="text-primary flex size-7 items-center justify-center mt-1">
              <Clock />
            </div>
            <div className="flex flex-col">
              <p className="text-[#111418] dark:text-white text-base font-bold">Horários</p>
              <p className="text-[#5f728c] dark:text-gray-400 text-base">{mockRestaurantData.openingHours}</p>
            </div>
          </div>
          
          {/* Pagamento */}
          <div className="flex items-start gap-4">
            <div className="text-primary flex size-7 items-center justify-center mt-1">
              <CreditCard />
            </div>
            <div className="flex flex-col">
              <p className="text-[#111418] dark:text-white text-base font-bold">Formas de pagamento</p>
              <p className="text-[#5f728c] dark:text-gray-400 text-base">{mockRestaurantData.paymentMethods}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation (Customer) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-background-dark border-t border-gray-200 dark:border-gray-800 max-w-md mx-auto z-30">
        <CustomerBottomNav selectedTab="home" />
      </div>
    </div>
  );
}