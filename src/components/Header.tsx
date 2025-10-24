import React from 'react';
import { ArrowLeft, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Action {
  icon: LucideIcon;
  onClick: () => void;
}

interface HeaderProps {
  title: string;
  leftAction?: Action;
  rightAction?: Action;
}

const Header: React.FC<HeaderProps> = ({ title, leftAction, rightAction }) => {
  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm p-4 flex items-center justify-between h-16">
      <div className="w-10">
        {leftAction && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={leftAction.onClick}
            className="text-primary hover:bg-primary/10"
          >
            <leftAction.icon className="h-5 w-5" />
          </Button>
        )}
      </div>
      
      <h1 className="text-lg font-extrabold text-primary tracking-tight truncate max-w-[60%]">
        {title}
      </h1>
      
      <div className="w-10 flex justify-end">
        {rightAction && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={rightAction.onClick}
            className="text-primary hover:bg-primary/10"
          >
            <rightAction.icon className="h-5 w-5" />
          </Button>
        )}
      </div>
    </header>
  );
};

export default Header;