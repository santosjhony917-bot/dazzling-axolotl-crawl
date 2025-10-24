import React from 'react';
import { Link } from 'react-router-dom';
import { LogOut, Crown, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface Tab {
  name: string;
  path: string;
  icon: LucideIcon;
  isPremium: boolean;
}

interface RestaurantSidebarProps {
  tabs: Tab[];
  selectedTab: string;
  restaurantName: string;
  isPremium: boolean;
  onLogout: () => void;
}

export default function RestaurantSidebar({ tabs, selectedTab, restaurantName, isPremium, onLogout }: RestaurantSidebarProps) {
  return (
    <div className="hidden sm:flex flex-col w-64 bg-white border-r shadow-lg">
      <div className="p-6">
        <h2 className="text-2xl font-extrabold text-[#022D68] mb-1">
          <span className="text-[#E47948]">D</span>yAd
        </h2>
        <p className="text-sm text-gray-500 truncate">{restaurantName}</p>
        <div className={cn("mt-2 text-xs font-semibold px-3 py-1 rounded-full inline-flex items-center", isPremium ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-600")}>
          <Crown className="w-3 h-3 mr-1" />
          {isPremium ? 'Plano Premium' : 'Plano Free'}
        </div>
      </div>
      
      <Separator />

      <nav className="flex-1 p-4 space-y-1">
        {tabs.map((tab) => (
          <Link
            key={tab.name}
            to={tab.path}
            className={cn(
              "flex items-center p-3 rounded-lg transition-colors",
              selectedTab === tab.name
                ? "bg-[#022D68] text-white shadow-md"
                : "text-gray-600 hover:bg-gray-100"
            )}
          >
            <tab.icon className="w-5 h-5 mr-3" />
            <span className="font-medium">{tab.name}</span>
            {tab.isPremium && !isPremium && (
              <span className="ml-auto text-xs font-bold bg-yellow-500 text-white px-2 py-0.5 rounded-full">
                Premium
              </span>
            )}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t">
        <Button 
          onClick={onLogout} 
          variant="ghost" 
          className="w-full justify-start text-red-500 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Sair
        </Button>
      </div>
    </div>
  );
}