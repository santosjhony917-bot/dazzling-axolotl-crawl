import React from 'react';
import { ChevronRight, LucideIcon, Crown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface NavCardItemProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
  isPremium?: boolean;
  premiumDescription?: string;
}

const NavCardItem: React.FC<NavCardItemProps> = ({
  icon: Icon,
  title,
  description,
  onClick,
  isPremium = false,
  premiumDescription,
}) => {
  return (
    <Card 
      className={cn(
        "flex items-center p-4 cursor-pointer transition-all duration-200 hover:bg-gray-50 border-none shadow-sm",
        !isPremium && premiumDescription && "opacity-80"
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-center size-10 rounded-full bg-[#022D68]/10 text-[#022D68] mr-4 shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className="text-base font-semibold text-gray-800 truncate">{title}</h3>
        <p className="text-sm text-gray-500 mt-0.5">
          {description}
        </p>
      </div>
      
      <div className="flex items-center ml-4 shrink-0">
        {premiumDescription && !isPremium && (
          <div className="flex items-center text-xs font-medium text-highlight bg-highlight/10 px-2 py-1 rounded-full mr-2">
            <Crown className="w-3 h-3 mr-1 fill-highlight" />
            Premium
          </div>
        )}
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </div>
    </Card>
  );
};

export default NavCardItem;