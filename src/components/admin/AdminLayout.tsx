import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Menu } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, Outlet } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import AdminSidebar from './AdminSidebar';

interface AdminLayoutProps {
  title: string;
  // Removendo children, pois usaremos Outlet
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ title }) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const SidebarContent = (
    <AdminSidebar 
      isCollapsed={isCollapsed} 
      toggleCollapse={toggleCollapse} 
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

      {/* Mobile Sidebar (Sheet) */}
      {isMobile && (
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetContent side="left" className="p-0 w-64 sm:w-72">
            <AdminSidebar 
              isCollapsed={false} 
              toggleCollapse={() => setIsSheetOpen(false)} 
            />
          </SheetContent>
        </Sheet>
      )}

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200 shadow-sm sticky top-0 z-20">
          <div className="flex items-center gap-4">
            {isMobile && (
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => setIsSheetOpen(true)}>
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
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