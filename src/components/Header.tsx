import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Action {
  icon: LucideIcon;
  onClick: () => void;
}

interface HeaderProps {
  title: string;
  leftAction?: Action;
  rightAction?: Action;
  dark?: boolean;
}

const Header: React.FC<HeaderProps> = ({ title, leftAction, rightAction, dark = false }) => {
  return (
    <header className={cn(
      "flex flex-row items-center justify-between w-full px-5 pt-8 pb-4 transition-all duration-200",
      dark ? "bg-[#090D1A] border-b border-white/5" : "bg-white"
    )}>
      <div className="w-12 flex justify-start">
        {leftAction && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={leftAction.onClick}
            className={cn(
              "rounded-full h-12 w-12 transition-colors",
              dark ? "text-slate-300 hover:bg-white/5 hover:text-white" : "text-[#3C2F2F] hover:bg-gray-100"
            )}
          >
            <leftAction.icon className="h-6 w-6 stroke-[2]" />
          </Button>
        )}
      </div>
      
      <h1 className={cn(
        "text-xl font-semibold tracking-tight truncate flex-1 text-center font-['Poppins'] transition-colors",
        dark ? "text-white" : "text-[#3C2F2F]"
      )}>
        {title}
      </h1>
      
      <div className="w-12 flex justify-end">
        {rightAction && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={rightAction.onClick}
            className={cn(
              "rounded-full h-12 w-12 transition-colors",
              dark ? "text-slate-300 hover:bg-white/5 hover:text-white" : "text-[#3C2F2F] hover:bg-gray-100"
            )}
          >
            <rightAction.icon className="h-6 w-6 stroke-[2]" />
          </Button>
        )}
      </div>
    </header>
  );
};

export default Header;