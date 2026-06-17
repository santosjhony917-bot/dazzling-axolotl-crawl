import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Action {
  icon: LucideIcon;
  onClick: () => void;
}

interface HeaderProps {
  title: string | React.ReactNode;
  subtitle?: string;
  leftAction?: Action;
  rightAction?: Action;
  rightElement?: React.ReactNode;
  children?: React.ReactNode;
  dark?: boolean;
}

const Header: React.FC<HeaderProps> = ({ title, subtitle, leftAction, rightAction, rightElement, children, dark = false }) => {
  return (
    <header className={cn(
      "flex flex-col w-full px-5 pt-4 pb-3 transition-all duration-200 sticky top-0 z-50",
      dark ? "bg-[#090D1A]/80 backdrop-blur-md border-b border-white/5" : "bg-white/90 backdrop-blur-md border-b border-slate-100/50"
    )}>
      <div className="flex flex-row items-center justify-between w-full">
        <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
          {leftAction && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={leftAction.onClick}
              className={cn(
                "w-10 h-10 rounded-full shrink-0 transition-colors",
                dark ? "bg-white/10 hover:bg-white/20 text-white" : "bg-slate-100 hover:bg-slate-200 text-[#3C2F2F]"
              )}
            >
              <leftAction.icon className="h-5 w-5 stroke-[2.5]" />
            </Button>
          )}
          <div className="flex flex-col min-w-0">
            {typeof title === 'string' ? (
              <h1 className={cn(
                "text-2xl font-bold tracking-tight truncate font-['Poppins'] leading-tight transition-colors",
                dark ? "text-white" : "text-[#3C2F2F]"
              )}>
                {title}
              </h1>
            ) : (
              title
            )}
            {subtitle && (
              <p className={cn(
                "text-xs font-medium truncate",
                dark ? "text-slate-400" : "text-slate-500"
              )}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
        
        {(rightAction || rightElement) && (
          <div className="flex items-center gap-2 justify-end shrink-0 pl-2">
            {rightElement}
            {rightAction && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={rightAction.onClick}
                className={cn(
                  "w-10 h-10 rounded-full shrink-0 transition-colors",
                  dark ? "bg-white/10 hover:bg-white/20 text-white" : "bg-slate-100 hover:bg-slate-200 text-[#3C2F2F]"
                )}
              >
                <rightAction.icon className="h-5 w-5 stroke-[2.5]" />
              </Button>
            )}
          </div>
        )}
      </div>
      {children && (
        <div className="mt-4 w-full">
          {children}
        </div>
      )}
    </header>
  );
};

export default Header;