import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/context/AuthContext';
import RestaurantBottomNav from './RestaurantBottomNav';
import { createPageUrl, PathKey } from '@/utils/url';
import { cn } from '@/lib/utils';

interface RestaurantAreaPageLayoutProps {
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  backPath?: PathKey;
}

const RestaurantAreaPageLayout: React.FC<RestaurantAreaPageLayoutProps> = ({ title, icon: Icon, children, backPath = 'restaurant-area/profile-menu' }) => {
  const navigate = useNavigate();
  const { isPremium } = useAuthContext();
  const isFree = !isPremium;

  return (
    <div className="min-h-screen bg-[#f5f7f8] pb-20 max-w-md mx-auto">
      
      {/* Header Fixo */}
      <header className="flex items-center bg-white p-4 pb-2 justify-between sticky top-0 z-20 shadow-soft-md w-full max-w-md mx-auto">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(createPageUrl(backPath))}
          className="text-[#022D68] hover:bg-[#022D68]/5"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-6 w-6 text-[#022D68]" />}
          <h2 className="text-[#022D68] text-xl font-bold">{title}</h2>
        </div>
        <div className="w-10"></div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full">
        {children}
      </main>
      
      {/* Bottom Navigation */}
      <RestaurantBottomNav selectedTab="upgrade" isFree={isFree} />
    </div>
  );
};

export default RestaurantAreaPageLayout;