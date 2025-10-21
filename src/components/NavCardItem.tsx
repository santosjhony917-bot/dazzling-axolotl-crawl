import React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

interface NavCardItemProps {
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  description: string;
}

const NavCardItem: React.FC<NavCardItemProps> = ({ label, icon: Icon, onClick, description }) => {
  return (
    <Card 
      onClick={onClick}
      className={cn(
        "w-full p-4 flex items-center justify-between transition-all cursor-pointer",
        "bg-white border-none rounded-xl shadow-md hover:shadow-lg active:scale-[0.99]",
        "dark:bg-gray-800 dark:hover:bg-gray-700"
      )}
    >
      <div className="flex items-center gap-4">
        {/* Ícone Circular de Fundo Claro */}
        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center shrink-0 text-[#022D68] dark:bg-gray-700">
          <Icon className="w-5 h-5" />
        </div>
        
        {/* Texto */}
        <div className="flex-1">
          <p className="text-base font-bold text-[#022D68] leading-snug">
            {label}
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {description}
          </p>
        </div>
      </div>
      
      {/* Seta de Navegação */}
      <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
    </Card>
  );
};

export default NavCardItem;