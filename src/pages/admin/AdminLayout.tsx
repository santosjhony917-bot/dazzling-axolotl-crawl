import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Home, Utensils, Users, LogOut, Settings, Crown, Loader2, Megaphone } from 'lucide-react';
import { useAuthData } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { createPageUrl, PathKey } from '@/utils/url';
import { cn } from '@/lib/utils';

// Definindo um tipo para os itens de navegação para garantir segurança de tipo
type NavItem = {
  name: string;
  icon: React.ElementType; // Usamos React.ElementType para os ícones Lucide
  pathKey: PathKey; // Agora, esta é uma chave direta do PATH_MAP
};

const navItems: NavItem[] = [
  { name: 'Dashboard', icon: Home, pathKey: 'adminDashboard' },
  { name: 'Gerenciar Restaurantes', icon: Utensils, pathKey: 'adminRestaurants' },
  { name: 'Gerenciar Planos', icon: Crown, pathKey: 'adminPlans' },
  { name: 'Categorias Populares', icon: Crown, pathKey: 'adminPopularCategories' }, // Adicionado
  { name: 'Gerenciar Usuários', icon: Users, pathKey: 'adminUsers' },
  { name: 'Configurações', icon: Settings, pathKey: 'adminSettings' },
  { name: 'Banners', icon: Crown, pathKey: 'adminBanners' }, // Usando Crown como ícone temporário para Banners
];

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading, isAdmin, signOut } = useAuthData();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    // Redireciona se não for admin
    navigate(createPageUrl('adminLogin'));
    return null;
  }

  const currentPath = window.location.pathname.split('/').pop();

  // Adicionando o item de Banners aqui
  const adminNavItems = [
    { name: 'Dashboard', icon: Home, path: 'dashboard' },
    { name: 'Gerenciar Restaurantes', icon: Utensils, path: 'restaurants' },
    { name: 'Gerenciar Planos', icon: Crown, path: 'plans' },
    { name: 'Gerenciar Usuários', icon: Users, path: 'users' },
    { name: 'Gerenciar Banners', icon: Megaphone, path: 'adminBanners' }, // CORRIGIDO: Usando a chave PATH_MAP
    { name: 'Configurações', icon: Settings, path: 'settings' },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-soft-lg p-4 flex flex-col">
        <h1 className="text-2xl font-bold text-primary mb-6">Admin Panel</h1>
        
        <nav className="flex-grow space-y-2">
          {adminNavItems.map((item) => (
            <Button
              key={item.path}
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 rounded-lg",
                currentPath === item.path && "bg-primary/10 text-primary font-semibold shadow-soft-sm"
              )}
              onClick={() => navigate(createPageUrl(item.path as PathKey))} // CORRIGIDO: Passando a chave diretamente
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Button>
          ))}
        </nav>
        
        <Separator className="my-4" />
        
        <div className="space-y-2">
          <div className="text-sm text-gray-600 truncate p-2">
            Logado como: <span className="font-medium">{user.email}</span>
          </div>
          <Button 
            variant="outline" 
            className="w-full justify-start gap-3 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 rounded-lg"
            onClick={signOut}
          >
            <LogOut className="w-5 h-5" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;