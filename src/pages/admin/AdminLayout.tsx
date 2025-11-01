"use client";

import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { Home, Utensils, Users, LogOut, Settings, Crown, Loader2, Megaphone } from 'lucide-react';
import { useAuthData } from '@/context/AuthContext'; // Corrigido: usando 'useAuthData'
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const { user, isProfileLoading, isAdmin, signOut } = useAuthData(); // Corrigido: usando 'isProfileLoading', 'isAdmin', 'signOut'
  const location = useLocation();

  const handleLogout = async () => {
    await signOut();
    navigate('/admin/login');
  };

  if (isProfileLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    // Se não for admin ou não estiver logado, redireciona para a página de login do admin
    return <Loader2 className="h-8 w-8 animate-spin text-blue-600" />; // Ou um componente de redirecionamento
  }

  const navItems = [
    { name: 'Dashboard', icon: Home, path: '/admin/dashboard' },
    { name: 'Restaurantes', icon: Utensils, path: '/admin/restaurants' },
    { name: 'Usuários', icon: Users, path: '/admin/users' },
    { name: 'Planos', icon: Crown, path: '/admin/plans' },
    { name: 'Banners', icon: Megaphone, path: '/admin/banners' },
    { name: 'Configurações', icon: Settings, path: '/admin/settings' },
  ];

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg p-4 flex flex-col">
        <div className="text-2xl font-bold text-[#022D68] mb-6">Admin Panel</div>
        <nav className="flex-grow">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.name}>
                <Link
                  to={item.path}
                  className={cn(
                    "flex items-center p-3 rounded-md text-gray-700 hover:bg-gray-100",
                    location.pathname.startsWith(item.path) && "bg-gray-100 font-semibold text-[#E47948]"
                  )}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <Separator className="my-4" />
        <Button variant="ghost" className="w-full justify-start text-red-600 hover:bg-red-50" onClick={handleLogout}>
          <LogOut className="h-5 w-5 mr-3" /> Sair
        </Button>
      </aside>

      {/* Main Content */}
      <div className="flex-grow p-6">
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;