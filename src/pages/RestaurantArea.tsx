import { Outlet, useLocation } from 'react-router-dom';
import { RestaurantBottomNav } from '@/components/restaurant/RestaurantBottomNav';
import { Home, BarChart2, Utensils, Rocket, User, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { RestaurantSidebar } from '@/components/restaurant/RestaurantSidebar';

const navItems = [
  {
    name: 'Dashboard',
    href: '/restaurant',
    icon: Home,
  },
  {
    name: 'Analytics',
    href: '/restaurant/analytics',
    icon: BarChart2,
  },
  {
    name: 'Menu',
    href: '/restaurant/menu',
    icon: Utensils,
  },
  {
    name: 'Upgrade',
    href: '/restaurant/upgrade',
    icon: Rocket,
  },
  {
    name: 'Settings',
    href: '/restaurant/settings',
    icon: User,
  },
];

export default function RestaurantArea() {
  const location = useLocation();
  const { signOut } = useAuth();
  const { role } = useUserRole();

  const isRestaurant = role === 'restaurant' || role === 'premium_restaurant';

  if (!isRestaurant) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-4 text-center">
        <h1 className="text-2xl font-bold">Acesso Negado</h1>
        <p className="mt-2 text-muted-foreground">
          Você não tem permissão para acessar a área do restaurante.
        </p>
        <Button onClick={signOut} className="mt-4">
          Voltar ao Login
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar for Desktop */}
      <RestaurantSidebar navItems={navItems} location={location} signOut={signOut} />

      {/* Main Content Area */}
      <main className="flex-1 pb-16 md:ml-64 md:pb-0">
        <div className="p-4 md:p-8">
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation for Mobile */}
      <RestaurantBottomNav />
    </div>
  );
}