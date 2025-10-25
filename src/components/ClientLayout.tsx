import React from 'react';
import { ArrowLeft, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import CustomerBottomNav from './CustomerBottomNav';
import { cn } from '@/lib/utils';

interface ClientLayoutProps {
  title: string;
  children: React.ReactNode;
  selectedTab: 'home' | 'search' | 'favorites' | 'perfil';
  showBackButton?: boolean;
}

const ClientLayout: React.FC<ClientLayoutProps> = ({ title, children, selectedTab, showBackButton = true }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f5f7f8] flex flex-col">
      
      {/* Header */}
      <header className="flex items-center bg-white p-4 pb-2 justify-between sticky top-0 z-20 shadow-sm w-full max-w-md mx-auto">
        <div className="w-10">
          {showBackButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="text-[#022D68] hover:bg-[#022D68]/5"
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <h2 className="text-[#022D68] text-xl font-bold">{title}</h2>
        </div>
        <div className="w-10"></div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-md mx-auto pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      <CustomerBottomNav selectedTab={selectedTab} />
    </div>
  );
};

export default ClientLayout;