import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { Home, Users, Utensils, LogOut, Settings, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/context/AuthContext';
import { showSuccess } from '@/utils/toast';

const navItems = [
  { name: 'Dashboard', icon: Home, path: '/admin/dashboard' },
  { name: 'Usuários', icon: Users, path: '/admin/users' },
  { name: 'Restaurantes', icon: Utensils, path: '/admin/restaurants' },
  { name: 'Configurações', icon: Settings, path: '/admin/settings' },
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
    // Should be handled by ProtectedRoute, but as a fallback
    navigate('/admin/login');
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    showSuccess("Desconectado com sucesso.");
    navigate('/admin/login');
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="flex flex-col w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 shadow-lg">
        <div className="flex items-center mb-6">
          <h2 className="text-xl font-bold text-primary dark:text-highlight">Admin Panel</h2>
        </div>
        
        <nav className="flex-grow space-y-1">
          {navItems.map((item) => {
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

        {/* Logout Section */}
        <div className="mt-auto space-y-2">
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
        <div className="p-4 md:p-8 w-full mx-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;