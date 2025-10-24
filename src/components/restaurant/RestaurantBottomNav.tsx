import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface Tab {
  name: string;
  path: string;
  icon: LucideIcon;
  isPremium: boolean;
}

interface RestaurantBottomNavProps {
  tabs: Tab[]; // Adicionando a prop tabs
  selectedTab: string;
  isFree: boolean;
}

export default function RestaurantBottomNav({ tabs, selectedTab, isFree }: RestaurantBottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg sm:hidden z-10">
      <div className="flex justify-around h-16 max-w-md mx-auto">
        {tabs.map((tab) => (
          <Link
            key={tab.name}
            to={tab.path}
            className={cn(
              "flex flex-col items-center justify-center text-xs font-medium transition-colors relative",
              selectedTab === tab.name
                ? "text-[#E47948]"
                : "text-gray-500 hover:text-[#022D68]"
            )}
          >
            <tab.icon className="w-5 h-5 mb-1" />
            {tab.name}
            {tab.isPremium && isFree && (
              <span className="absolute top-1 right-0 w-2 h-2 bg-yellow-500 rounded-full border border-white"></span>
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
}