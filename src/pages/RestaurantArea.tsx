import { Outlet, useLocation } from 'react-router-dom';
import RestaurantBottomNav from '@/components/restaurant/RestaurantBottomNav';
import { Home, BarChart2, Utensils, Rocket, User, ArrowLeft } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';

const getSelectedTab = (pathname: string) => {
  if (pathname.includes('/restaurant-area/home')) return 'home';
  if (pathname.includes('/restaurant-area/stats')) return 'stats'; // Chave 'stats' para a rota de busca/análise
  if (pathname.includes('/restaurant-area/menu')) return 'menu';
  if (pathname.includes('/restaurant-area/upgrade')) return 'upgrade';
  if (pathname.includes('/restaurant-area/profile-menu')) return 'perfil';
  return 'home';
};

const RestaurantArea = () => {
  const location = useLocation();
  const { isPremium } = useUserRole();
  const selectedTab = getSelectedTab(location.pathname);
  
  const isDashboardRoute = location.pathname.endsWith('/restaurant-area/home');
  const isProfileMenuRoute = location.pathname.endsWith('/restaurant-area/profile-menu');
  const isStatsRoute = location.pathname.includes('/restaurant-area/stats');
  const isHelpRoute = location.pathname.includes('/restaurant-area/help');

  const getHeaderContent = () => {
    if (isDashboardRoute || isProfileMenuRoute || isStatsRoute || isHelpRoute) {
        return { title: "", showHeader: false };
    }
    if (location.pathname.includes('/restaurant-area/menu')) {
        return { title: "Cardápio", showHeader: true };
    }
    if (location.pathname.includes('/restaurant-area/categories')) {
        return { title: "Gerenciar Categorias", showHeader: true };
    }
    if (location.pathname.includes('/restaurant-area/upgrade')) {
        return { title: "Plano Premium", showHeader: true };
    }
    return { title: "Meu Restaurante", showHeader: true };
  };

  const { title, showHeader } = getHeaderContent();

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark">
      {showHeader && (
        <header className="bg-white dark:bg-gray-800 shadow-sm p-4 flex items-center sticky top-0 z-10">
          <ArrowLeft className="h-6 w-6 mr-4 cursor-pointer" onClick={() => window.history.back()} />
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h1>
        </header>
      )}
      <main className="flex-1">
        <Outlet />
      </main>
      <RestaurantBottomNav selectedTab={selectedTab} isFree={!isPremium} />
    </div>
  );
};

export default RestaurantArea;