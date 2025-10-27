import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon } from 'lucide-react';
import RestaurantBottomNav from '@/components/restaurant/RestaurantBottomNav';
import { useAuthContext } from '@/context/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent } from '@/components/ui/card';

const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, restaurant } = useAuthContext();
  const { isPremium } = useUserRole();
  
  // NOTE: This component was previously named Search.tsx, but the user's error list refers to SearchUnifiedPage.tsx.
  // Assuming the user meant the general search page, I will keep the content simple.

  return (
    <div className="p-4 pt-10 min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
          <SearchIcon className="w-7 h-7 mr-2 text-primary" /> Buscar
        </h1>
        
        <Card className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          <CardContent className="p-0">
            <p className="text-gray-600 dark:text-gray-400">
              Aqui você poderá buscar por restaurantes, pratos e categorias.
            </p>
            <p className="mt-4 text-sm text-gray-500">
              (Funcionalidade de busca em desenvolvimento.)
            </p>
          </CardContent>
        </Card>
      </div>
      <RestaurantBottomNav />
    </div>
  );
};

export default SearchPage;