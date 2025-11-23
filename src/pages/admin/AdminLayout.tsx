import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Home, Utensils, Users, LogOut, Settings, Crown, Loader2, Megaphone, ChevronLeft, ChevronRight } from 'lucide-react';
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
  { name: 'Banners', icon: Megaphone, pathKey: 'adminBanners' }, // Usando Megaphone para Banners
];

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading, isAdmin, signOut } = useAuthData();
  
  // Inicializa o estado com base no localStorage
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('adminSidebarCollapsed');
    return saved === 'true';
  });

  // Atualiza o localStorage sempre que o estado mudar
  useEffect(() => {
    localStorage.setItem('adminSidebarCollapsed', String(isCollapsed));
  }, [isCollapsed]);

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

  const currentFullPath = window.location.pathname; // Obtém o caminho completo da URL

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-white shadow-soft-lg p-4 flex flex-col transition-all duration-300 ease-in-out",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        <div className="flex items-center justify-between mb-6">
          {!isCollapsed && <h1 className="text-2xl font-bold text-primary whitespace-nowrap overflow-hidden">Admin Panel</h1>}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn("ml-auto", isCollapsed && "mx-auto")}
          >
            {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </Button>
        </div>
        
        <nav className="flex-grow space-y-2">
          {navItems.map((item) => { // Usando a lista 'navItems' correta
            const itemUrl = createPageUrl(item.pathKey); // Gera a URL completa para comparação
            return (
              <Button
                key={item.pathKey} // Usando pathKey como chave
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 rounded-lg transition-all duration-200",
                  currentFullPath === itemUrl && "bg-primary/10 text-primary font-semibold shadow-soft-sm",
                  isCollapsed && "justify-center px-2"
                )}
                onClick={() => navigate(itemUrl)} // Navega para a URL completa
                title={isCollapsed ? item.name : undefined}
              >
                <item.icon className="w-5 h-5 min-w-[1.25rem]" />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </Button>
            );
          })}
        </nav>
        
        <Separator className="my-4" />
        
        <div className="space-y-2">
          {!isCollapsed && (
            <div className="text-sm text-gray-600 truncate p-2">
              Logado como: <span className="font-medium">{user.email}</span>
            </div>
          )}
          <Button 
            variant="outline" 
            className={cn(
              "w-full justify-start gap-3 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 rounded-lg",
              isCollapsed && "justify-center px-2"
            )}
            onClick={signOut}
            title={isCollapsed ? "Sair" : undefined}
          >
            <LogOut className="w-5 h-5 min-w-[1.25rem]" />
            {!isCollapsed && "Sair"}
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