import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Home, LogOut, Settings, Crown, Loader2, Megaphone, MapPin, Search } from 'lucide-react';
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
  queryParams?: Record<string, string>;
};

const navItems: NavItem[] = [
  { name: 'Dashboard', icon: Home, pathKey: 'adminDashboard' },
  { name: 'Projetos de Expansão', icon: MapPin, pathKey: 'adminExpansion' },
  { name: 'Coletor e Validação IA', icon: Search, pathKey: 'adminCollector' },
  { name: 'Gerenciar Planos', icon: Crown, pathKey: 'adminPlans' },
  { name: 'CRM & Vendas IA', icon: Megaphone, pathKey: 'adminCrm' },
  { name: 'Estratégia e Regras', icon: Settings, pathKey: 'adminSettings' },
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

  const currentFullPath = window.location.pathname; // Obtém o caminho completo da URL

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-none p-4 flex flex-col">
        <h1 className="text-2xl font-bold text-primary mb-6">Admin Panel</h1>
        
        <nav className="flex-grow space-y-2">
          {navItems.map((item, idx) => { // Usando a lista 'navItems' correta
            const itemUrl = createPageUrl(item.pathKey, undefined, item.queryParams as any); // Gera a URL completa para comparação
            const isActive = item.queryParams?.tab 
              ? window.location.search.includes(`tab=${item.queryParams.tab}`)
              : currentFullPath === createPageUrl(item.pathKey) && !window.location.search.includes('tab=');

            return (
              <Button
                key={`${item.pathKey}-${idx}`}
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 rounded-lg",
                  isActive && "bg-primary/10 text-primary font-semibold shadow-none"
                )}
                onClick={() => navigate(itemUrl)} // Navega para a URL completa
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Button>
            );
          })}
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