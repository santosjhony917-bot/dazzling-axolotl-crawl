import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Home, Utensils, Users, LogOut, Settings, Crown, Loader2 } from 'lucide-react';
import { useAuthContext } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { createPageUrl } from '@/utils/url';
import { cn } from '@/lib/utils';

const navItems = [
  { name: 'Dashboard', icon: Home, path: 'dashboard' },
  { name: 'Gerenciar Restaurantes', icon: Utensils, path: 'restaurants' },
  { name: 'Gerenciar Planos', icon: Crown, path: 'plans' },
  { name: 'Gerenciar Usuários', icon: Users, path: 'users' },
  { name: 'Configurações', icon: Settings, path: 'settings' },
];

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading, isAdmin, signOut } = useAuthContext();

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

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg p-4 flex flex-col">
        <h1 className="text-2xl font-bold text-primary mb-6">Admin Panel</h1>
        
        <nav className="flex-grow space-y-2">
          {navItems.map((item) => (
            <Button
              key={item.path}
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3",
                currentPath === item.path && "bg-primary/10 text-primary font-semibold"
              )}
              onClick={() => navigate(createPageUrl('admin', { subPath: item.path }))}
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
            className="w-full justify-start gap-3 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
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