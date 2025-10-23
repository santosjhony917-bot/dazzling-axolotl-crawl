import { Utensils } from 'lucide-react';
import { RestaurantBottomNav } from '@/components/restaurant/RestaurantBottomNav';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function RestaurantHome() {
  const { role } = useUserRole();
  const { signOut } = useAuth();

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
    <div className="p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6">Bem-vindo à Área do Restaurante</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Menu Management */}
        <Link to="/restaurant/menu">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg hover:shadow-xl transition duration-300 cursor-pointer">
            <Utensils className="w-8 h-8 text-primary mb-3" />
            <h2 className="text-xl font-semibold mb-2">Gerenciar Menu</h2>
            <p className="text-muted-foreground">Adicione, edite e organize seus pratos e categorias.</p>
          </div>
        </Link>

        {/* Card 2: Orders (Placeholder) */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg opacity-50 cursor-not-allowed">
          <Utensils className="w-8 h-8 text-gray-400 mb-3" />
          <h2 className="text-xl font-semibold mb-2">Pedidos (Em Breve)</h2>
          <p className="text-muted-foreground">Acompanhe e gerencie todos os pedidos recebidos.</p>
        </div>

        {/* Card 3: Profile Settings */}
        <Link to="/restaurant/settings">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg hover:shadow-xl transition duration-300 cursor-pointer">
            <Utensils className="w-8 h-8 text-primary mb-3" />
            <h2 className="text-xl font-semibold mb-2">Configurações do Perfil</h2>
            <p className="text-muted-foreground">Atualize informações de contato, endereço e logo.</p>
          </div>
        </Link>
      </div>

      {/* <RestaurantBottomNav /> - Removed as it's now in RestaurantArea.tsx */}
    </div>
  );
}