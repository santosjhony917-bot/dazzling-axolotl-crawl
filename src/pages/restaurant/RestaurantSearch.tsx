import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, SlidersHorizontal } from 'lucide-react';
import PriceFilterDrawer from '@/components/PriceFilterDrawer';
import { showInfo } from '@/utils/toast';

// Mock data based on the HTML to represent search results
const mockDishes = [
  {
    name: 'Moqueca de Camarão',
    description: 'Um ensopado tradicional de camarão cozido em leite de coco...',
    price: 'R$ 59,90',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBBHrWSThqCVyD4_3q8qCWnjKoMgb92ydHMOS9k6RKl60kzcqt9lX4DT-EOGU054R8G2lC4TxFQpP1Ky2fnAFVy7MlSMk3TKZkMCHKwb-9t_6ds0PbdxtCvAtAwwVo8VoMtbHZdT6gnt_K7O5DnObRUJk7awd-HPPn8lD5uVJaw-9-u6jcK2XXKr3NzitHmFJsR1WJLdQO_L9YcgC59Ih7jB7dlSMqe7mIijgKq85LbLVADfZGlLhWRVBQe01dD5LHp6-rBPnS0896I',
  },
  {
    name: 'Picanha na Chapa',
    description: 'Picanha fatiada e grelhada em chapa quente, servida com...',
    price: 'R$ 79,90',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDBFUp3dj2NmpwAJGPx4ijsEPGu40WdrZjyOTvU1mvhN-pkRMO8QACUZltiNX9ZzOYEtZV0XyEY6vCMAvEPQMoLXYVxEqHGGJgZ0vqLbzjyAYLEgOkzfojlOdCeeHAKnKnNMgmB1Kmttsz8rwbqh8_yWxWAHk6BAZMvDhxtzskt1h6lugnxXAyByJfcrmm4giFM6axqZ8xsvq7lAVNvJpxeJipgjrrj0phUD4Pjyg55_ureoTAEchANlfuWOOGPIb9A6uqF3Ep-6bmL',
  },
  {
    name: 'Escondidinho de Macaxeira',
    description: 'Purê cremoso de macaxeira com recheio de carne de sol...',
    price: 'R$ 45,00',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBCpX4-oINjbrT_ASnaBWmQkhZYtjQ3vu1RX9WojZxK9B5RBJJ6pCE4VNUsZIlwXiIeTsnq9BmNe9B5_G9oYLmZ5B8UDJZHiIPlxaGW2keeM35BUexNG8zZ_5p50njchIUdjSJPZwaXfw0V-Df0-nqvBNjYzyNhevXjfKM0Omvrp8NFj1cBLl79yh2_oM2n-X5Xb4iI3mLd-J3RxAnmc0EYLE_k8-lnInS7ZHOLM0mHaK8qWYzPE1BdW2tnWFuzoGAhgZwm2jHhjnL9',
  },
  {
    name: 'Carne de Sol com Macaxeira',
    description: 'Carne de sol desfiada e acebolada, acompanhada de macaxeira frita...',
    price: 'R$ 65,50',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCwBKc5YM6IYmYrA2_LSuPwpsZ8CNJrneisUaHMswZAD8X_wom10O1WRQBqfZvWYi_7O4sz2ejh19RU6siKghj7mkE7rC2WxVWuWm7UaVVuIx7MQvpwbbXdvYKXnPKWooJsgBaIwNmmLQwoDtdbldFcRX4y27hI8lsdZaM89VXzQ3lXL_VaNFLVkeN7pKGIJ5I_UQiJkS34IYyBomvJKg0_SD1xt8mo5FUe1-z82fKioQNmlHUYn5grRokTTOVFuUYquAHOC4Bc1GMk',
  },
];

const RestaurantSearch = () => {
  const [searchType, setSearchType] = useState<'Pratos' | 'Restaurantes'>('Pratos');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  const handleFilterClick = () => {
    if (searchType === 'Pratos') {
      setIsFilterDrawerOpen(true);
    } else {
      showInfo("Filtros para restaurantes ainda não disponíveis.");
    }
  };

  const handleApplyPriceFilter = (priceRange: [number, number]) => {
    console.log("Aplicando filtro de preço:", priceRange);
    // A lógica de filtro dos pratos será implementada aqui
  };

  return (
    <div className="flex-1 bg-background-light dark:bg-background-dark">
      <header className="sticky top-0 z-10 bg-background-light dark:bg-background-dark px-4 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
            <Input
              className="w-full rounded-full border border-gray-200/80 dark:border-gray-700/80 bg-white dark:bg-gray-800 py-3 pl-12 pr-4 h-12 focus:ring-2 focus:ring-[#E47948] focus:border-transparent"
              placeholder="Buscar pratos ou restaurantes..."
              type="text"
            />
          </div>
          <Button size="icon" className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-white" onClick={handleFilterClick}>
            <SlidersHorizontal className="h-6 w-6" />
          </Button>
        </div>
      </header>

      <div className="flex px-4 py-3 bg-background-light dark:bg-background-dark">
        <div className="flex h-12 flex-1 items-center justify-center rounded-full bg-gray-200/80 dark:bg-gray-800 p-1">
          <button
            onClick={() => setSearchType('Pratos')}
            className={`flex h-full flex-1 cursor-pointer items-center justify-center rounded-full px-2 text-sm font-bold leading-normal transition-all ${
              searchType === 'Pratos'
                ? 'bg-[#E47948] text-white'
                : 'text-gray-500'
            }`}
          >
            <span className="truncate">Pratos</span>
          </button>
          <button
            onClick={() => setSearchType('Restaurantes')}
            className={`flex h-full flex-1 cursor-pointer items-center justify-center rounded-full px-2 text-sm font-bold leading-normal transition-all ${
              searchType === 'Restaurantes'
                ? 'bg-[#E47948] text-white'
                : 'text-gray-500'
            }`}
          >
            <span className="truncate">Restaurantes</span>
          </button>
        </div>
      </div>

      <main className="space-y-2 px-4 pb-24">
        {searchType === 'Pratos' && mockDishes.map((dish, index) => (
          <div key={index} className="rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-white dark:bg-gray-800 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1.5 flex-[2_2_0px]">
                <p className="text-gray-800 dark:text-gray-100 text-base font-bold leading-tight">{dish.name}</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-normal leading-normal">{dish.description}</p>
                <p className="text-[#E47948] text-lg font-bold mt-2">{dish.price}</p>
              </div>
              <div
                className="aspect-square w-28 flex-shrink-0 rounded-lg bg-cover bg-center"
                style={{ backgroundImage: `url('${dish.image}')` }}
              ></div>
            </div>
          </div>
        ))}
        {searchType === 'Restaurantes' && (
          <div className="text-center py-10 text-gray-500">
            <p>Busca por restaurantes ainda não implementada.</p>
          </div>
        )}
      </main>

      <PriceFilterDrawer
        isOpen={isFilterDrawerOpen}
        onOpenChange={setIsFilterDrawerOpen}
        onApply={handleApplyPriceFilter}
      />
    </div>
  );
};

export default RestaurantSearch;