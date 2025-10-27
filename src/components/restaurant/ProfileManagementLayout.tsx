import React, { ReactNode } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Home, Utensils, Settings, Crown, LogOut, User, MapPin, Package, Camera, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import RestaurantBottomNav from './RestaurantBottomNav';
import { useAuthContext } from '@/context/AuthContext';
import { Restaurant } from '@/types/supabase';
import { Separator } from '@/components/ui/separator';
import { showSuccess } from '@/utils/toast';

interface ProfileManagementLayoutProps {
  restaurant: Restaurant;
  children: ReactNode;
}

const navItems = (restaurantId: string, isPremium: boolean) => [
  { name: 'Início', icon: Home, path: `/restaurant-area/${restaurantId}/dashboard` },
  { name: 'Cardápio', icon: Utensils, path: `/restaurant-area/${restaurantId}/menu` },
  { name: 'Galeria', icon: Camera, path: `/restaurant-area/${restaurantId}/gallery` },
  { name: 'Informações', icon: Settings, path: `/restaurant-area/${restaurantId}/info` },
  { name: 'Localização', icon: MapPin, path: `/restaurant-area/${restaurantId}/location` },
  { name: 'Planos', icon: Crown, path: `/restaurant-area/${restaurantId}/upgrade`, premiumOnly: false },
  { name: 'Avaliações', icon: Star, path: `/restaurant-area/${restaurantId}/reviews`, premiumOnly: true },
];

const ProfileManagementLayout: React.FC<ProfileManagementLayoutProps> = ({ restaurant, children }) => {
  const { signOut } = useAuthContext();
  const isPremium = restaurant.plan === 'premium';
  const restaurantId = restaurant.id;

  const handleSignOut = async () => {
    await signOut();
    showSuccess("Desconectado com sucesso.");
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 shadow-lg">
        <div className="flex items-center mb-6">
          <Package className="w-6 h-6 text-primary mr-2" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">{restaurant.name}</h2>
        </div>
        
        <nav className="flex-grow space-y-1">
          {navItems(restaurantId, isPremium).map((item) => {
            if (item.premiumOnly && !isPremium) return null;
            
            // Simple active check based on current path
            const isActive = window.location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "flex items-center p-3 rounded-lg transition-colors duration-150",
                  isActive
                    ? "bg-primary text-white shadow-md"
                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                )}
              >
                <item.icon className="w-5 h-5 mr-3" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <Separator className="my-4 dark:bg-gray-700" />

        {/* User/Logout Section */}
        <div className="mt-auto space-y-2">
          <Link
            to="/profile"
            className="flex items-center p-3 rounded-lg text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors duration-150"
          >
            <User className="w-5 h-5 mr-3" />
            <span className="font-medium">Meu Perfil</span>
          </Link>
          <Button
            onClick={handleSignOut}
            variant="ghost"
            className="w-full justify-start p-3 text-red-500 hover:bg-red-50 dark:hover:bg-gray-700"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        <div className="p-4 md:p-8 max-w-4xl w-full mx-auto">
          {children}
        </div>
      </div>

      {/* Bottom Navigation */}
      <RestaurantBottomNav />
    </div>
  );
};

export default ProfileManagementLayout;