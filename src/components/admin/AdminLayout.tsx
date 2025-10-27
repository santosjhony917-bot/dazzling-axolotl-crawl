import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, Utensils, Users, Settings, LogOut, ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils/url';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

// Definição dos itens de navegação do painel de administração
const navItems = [
  { name: 'Dashboard', path: createPageUrl('adminDashboard'), icon: Home },
  { name: 'Gerenciar Restaurantes', path: createPageUrl('adminRestaurants'), icon: Utensils },
  { name: 'Gerenciar Usuários', path: createPageUrl('adminUsers'), icon: Users },
  { name: 'Transações', path: createPageUrl('adminTransactions'), icon: ArrowLeftRight },
  { name: 'Configurações', path: createPageUrl('adminSettings'), icon: Settings },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate(createPageUrl('welcome'));
    } catch (error) {
      console.error('Logout error:', error);
      showError('Falha ao sair. Tente novamente.');
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg flex flex-col fixed h-full">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-2xl font-bold text-primary">Admin Panel</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Button
                key={item.path}
                variant="ghost"
                className={cn(
                  "w-full justify-start text-base font-medium h-11 transition-colors",
                  isActive
                    ? "bg-primary text-white hover:bg-primary/90"
                    : "text-gray-600 hover:bg-gray-100 hover:text-primary"
                )}
                onClick={() => navigate(item.path)}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </Button>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-100">
          <Button
            variant="ghost"
            className="w-full justify-start text-base font-medium h-11 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={handleLogout}
          >
            <LogOut className="mr-3 h-5 w-5" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        <Outlet />
      </main>
    </div>
  );
}