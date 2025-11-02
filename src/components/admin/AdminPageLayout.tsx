import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Utensils, Users, Settings, DollarSign, FileText, UploadCloud, Home, Megaphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils/url';

interface AdminPageLayoutProps {
  children: React.ReactNode;
}

const AdminPageLayout: React.FC<AdminPageLayoutProps> = ({ children }) => {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: createPageUrl('adminDashboard') },
    { name: 'Restaurantes', icon: Utensils, path: createPageUrl('adminRestaurants') },
    { name: 'Planos', icon: DollarSign, path: createPageUrl('adminPlans') },
    { name: 'Usuários Admin', icon: Users, path: createPageUrl('adminUsers') },
    { name: 'Categorias Populares', icon: Home, path: createPageUrl('adminCategories') },
    { name: 'Arquivos', icon: FileText, path: createPageUrl('adminFiles') },
    { name: 'Importar Menu', icon: UploadCloud, path: createPageUrl('adminImport') },
    { name: 'Banners', icon: Megaphone, path: createPageUrl('adminBanners') },
    { name: 'Configurações', icon: Settings, path: createPageUrl('adminSettings') },
  ];

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md p-4 flex flex-col">
        <h2 className="text-2xl font-bold text-primary mb-6">Admin Panel</h2>
        <nav className="space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={cn(
                "flex items-center p-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors",
                location.pathname === item.path && "bg-highlight text-white hover:bg-highlight/90"
              )}
            >
              <item.icon className={cn("h-5 w-5 mr-3", location.pathname === item.path ? "text-white" : "text-gray-500")} />
              <span className={location.pathname === item.path ? "text-white" : "text-gray-700"}>{item.name}</span>
            </Link>
          ))}
        </nav>
        <div className="mt-auto pt-4 border-t border-gray-200">
          <Button variant="ghost" className="w-full justify-start text-red-600 hover:bg-red-50">
            Sair
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
};

export default AdminPageLayout;