import React from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2 } from 'lucide-react';
import { useNavigate, Outlet, Navigate } from 'react-router-dom';
import { useAuthContext } from '@/context/AuthContext';
import { createPageUrl } from '@/utils/url';

interface AdminLayoutProps {
  title: string;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ title }) => {
  const navigate = useNavigate();
  
  const { user, isLoading, isAdmin, signOut } = useAuthContext();

  console.log(`[AdminLayout] Loading: ${isLoading}, IsAdmin: ${isAdmin}, User: ${!!user}`);

  // 1. Se o carregamento inicial estiver ativo, mostre o loader.
  if (isLoading) {
    console.log("[AdminLayout] Showing Loader.");
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // 2. Se o usuário não for admin, redirecione para o login.
  if (!user || !isAdmin) {
    console.log("[AdminLayout] Redirecting to Admin Login (Permission Denied).");
    return <Navigate to={createPageUrl('admin/login')} replace />;
  }

  console.log("[AdminLayout] Rendering Minimal Layout.");

  const handleSignOut = async () => {
    await signOut();
    navigate(createPageUrl('admin/login'));
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      
      {/* Header Mínimo */}
      <header className="flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200 shadow-sm sticky top-0 z-20">
        <h1 className="text-xl font-semibold text-[#022D68]">{title}</h1>
        
        <Button 
          variant="ghost" 
          onClick={handleSignOut} 
          className="text-red-600 hover:bg-red-50"
        >
          <LogOut className="w-5 h-5 mr-2" />
          Sair
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <Outlet /> {/* Renderiza o conteúdo da rota filha aqui */}
      </main>
    </div>
  );
};

export default AdminLayout;