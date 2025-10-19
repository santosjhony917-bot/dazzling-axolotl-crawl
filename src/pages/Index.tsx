import React from "react";
import { motion } from "framer-motion";
import { MapPin, Store, ChevronRight, Star, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils/url";
import RestaurantBottomNav from "@/components/restaurant/RestaurantBottomNav"; // Importando o novo componente

export default function Index() {
  const navigate = useNavigate();
  
  const highlights = [
    { id: 1, name: 'Hambúrguer Gourmet', restaurant: 'Burger Joint', price: 35.00, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=2070&auto=format&fit=crop' },
    { id: 2, name: 'Moqueca de Camarão', restaurant: 'Restaurante do Mar', price: 75.00, image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=2074&auto=format&fit=crop' },
    { id: 3, name: 'Sushi Variado', restaurant: 'Sushi House', price: 90.00, image: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?q=80&w=2070&auto=format&fit=crop' },
  ];

  const nearbyRestaurants = [
    { id: 1, name: 'Trattoria del Ponte', cuisine: 'Italiana', distance: '1.2 km', rating: 4.7, image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070&auto=format&fit=crop' },
    { id: 2, name: 'Sakura Sushi', cuisine: 'Japonesa', distance: '2.5 km', rating: 4.9, image: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?q=80&w=2070&auto=format&fit=crop' },
    { id: 3, name: 'Le Petit Bistrot', cuisine: 'Francesa', distance: '3.1 km', rating: 4.6, image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=2070&auto=format&fit=crop' },
  ];
  
  const handleGoToRestaurantArea = () => {
    navigate(createPageUrl('restaurant-area'));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-24 max-w-md mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-gray-100 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#E47948]/10 rounded-full flex items-center justify-center">
              <MapPin className="w-5 h-5 text-[#E47948]" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Sua Localização</p>
              <h2 className="text-sm font-bold text-[#022D68]">João Pessoa, PB</h2>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-10 h-10 rounded-full bg-[#022D68]/10 hover:bg-[#022D68]/20"
            onClick={handleGoToRestaurantArea}
          >
            <Store className="w-5 h-5 text-[#022D68]" />
          </Button>
        </div>
      </div>

      {/* Quick Actions (Adaptado para Cliente: Buscar) */}
      <div className="px-4 pt-4 pb-6">
        <Button
          onClick={() => navigate(createPageUrl('search-restaurants'))}
          className="w-full h-16 bg-[#E47948] hover:bg-[#E47948]/90 text-white font-bold text-lg rounded-2xl shadow-lg"
        >
          <Search className="w-5 h-5 mr-2" />
          Buscar Restaurantes Próximos
        </Button>
      </div>

      {/* Premium Banner (Adaptado para Cliente: Destaque) */}
      <div className="px-4 pb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-[#022D68] to-[#022D68]/80 p-6 shadow-lg"
        >
          <div className="relative z-10">
            <h3 className="text-xl font-bold text-white mb-2">Descubra o Premium!</h3>
            <p className="text-sm text-white/90 mb-4 max-w-xs">
              Veja os restaurantes mais exclusivos e bem avaliados.
            </p>
            <Button className="bg-[#E47948] hover:bg-[#E47948]/90 text-white rounded-full font-semibold shadow-lg">
              Explorar
            </Button>
          </div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-white"></div>
            <div className="w-2 h-2 rounded-full bg-white/50"></div>
            <div className="w-2 h-2 rounded-full bg-white/50"></div>
          </div>
        </motion.div>
      </div>

      {/* Highlights */}
      <div className="pb-6">
        <div className="flex justify-between items-center px-4 pb-4">
          <h2 className="text-xl font-bold text-[#022D68]">Destaques do Dia</h2>
          <button className="text-sm font-semibold text-[#E47948]">Ver todos</button>
        </div>
        <div className="flex overflow-x-auto gap-4 px-4 pb-2 hide-scrollbar">
          {highlights.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex-shrink-0 w-72 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all"
            >
              <div className="h-40 bg-gray-200 overflow-hidden">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              </div>
              <div className="p-4">
                <h3 className="font-bold text-gray-900 mb-1">{item.name}</h3>
                <p className="text-sm text-gray-500 mb-2">{item.restaurant}</p>
                <p className="text-lg font-bold text-[#E47948]">
                  R$ {item.price.toFixed(2).replace('.', ',')}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Nearby Restaurants */}
      <div className="px-4">
        <div className="flex justify-between items-center pb-4">
          <h2 className="text-xl font-bold text-[#022D68]">Restaurantes Próximos</h2>
          <button className="text-sm font-semibold text-[#E47948]">Ver todos</button>
        </div>
        <div className="space-y-3">
          {nearbyRestaurants.map((restaurant, index) => (
            <motion.div
              key={restaurant.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-4 bg-white rounded-2xl p-3 shadow-sm border border-gray-100 hover:shadow-md transition-all"
            >
              <div className="w-20 h-20 bg-gray-200 rounded-xl overflow-hidden flex-shrink-0">
                <img src={restaurant.image} alt={restaurant.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 truncate">{restaurant.name}</h3>
                <p className="text-sm text-gray-500">
                  {restaurant.cuisine} • {restaurant.distance}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-4 h-4 text-[#E47948] fill-[#E47948]" />
                  <span className="text-sm font-semibold text-gray-900">{restaurant.rating}</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full bg-[#E47948]/10 flex-shrink-0">
                <ChevronRight className="w-5 h-5 text-[#E47948]" />
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
      <MadeWithDyad />
      <RestaurantBottomNav />
    </div>
  );
}