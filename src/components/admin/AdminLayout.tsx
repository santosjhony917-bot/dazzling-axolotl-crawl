import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Menu, Loader2 } from 'lucide-react';
import { useNavigate, Outlet, Navigate } from 'react-router-dom';
import { useAuthContext } from '@/context/AuthContext';
import { createPageUrl } from '@/utils/url';
import { cn } from '@/lib/utils';
import AdminSidebar from './AdminSidebar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';

interface AdminLayoutProps {
  title: string;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ title }) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  
  const { user, isLoading, isAdmin, signOut } = useAuthContext();

  // 1. Se o carregamento inicial estiver ativo, mostre o loader.
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // 2. Se o usuário não for admin, redirecione para o login.
  if (!user || !isAdmin) {
    return <Navigate to={createPageUrl('admin/login')} replace />;
  }

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate(createPageUrl('admin/login'));
  };

  const SidebarContent = (
    <AdminSidebar 
      isCollapsed={isCollapsed} 
      toggleCollapse={isMobile ? () => setIsSheetOpen(false) : toggleCollapse} 
    />
  );

  return (
    <div className="flex h-screen bg-gray-50">
      
      {/* Desktop Sidebar */}
      {!isMobile && (
        <div className={cn("hidden md:block", isCollapsed ? "w-20" : "w-64")}>
          {SidebarContent}
        </div>
      )}

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200 shadow-sm sticky top-0 z-20">
          <div className="flex items-center gap-4">
            {isMobile ? (
              <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="w-6 h-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-64 sm:w-72">
                  <AdminSidebar 
                    isCollapsed={false} 
                    toggleCollapse={() => setIsSheetOpen(false)} 
                  />
                </SheetContent>
              </Sheet>
            ) : (
              <Button variant="ghost" size="icon" onClick={toggleCollapse}>
                <Menu className="w-6 h-6" />
              </Button>
            )}
            <h1 className="text-xl font-semibold text-[#022D68]">{title}</h1>
          </div>
          
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
    </div>
  );
};

export default AdminLayout;