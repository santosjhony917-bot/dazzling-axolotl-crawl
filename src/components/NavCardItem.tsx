import React from 'react';
import { ArrowRight, LucideProps } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavCardItemProps {
  title: string;
  description: string;
  // CORREÇÃO: Aceita o componente Lucide em si, não o ReactNode instanciado
  icon: React.FC<LucideProps>; 
  onClick: () => void;
  isLocked?: boolean;
}

const NavCardItem: React.FC<NavCardItemProps> = ({
  title,
  description,
  icon: IconComponent, // Renomeado para IconComponent
  onClick,
  isLocked = false,
}) => {
  return (
    <div
      className={cn(
        "flex items-center p-4 border rounded-xl transition-all cursor-pointer",
        isLocked ? "bg-gray-50 border-gray-200 opacity-70" : "hover:bg-primary/5 hover:border-primary/50"
      )}
      onClick={onClick}
    >
      <div className="mr-4 text-primary shrink-0">
        {/* CORREÇÃO: Instanciando o componente aqui */}
        <IconComponent className="w-6 h-6" /> 
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-base font-semibold text-primary truncate">{title}</h3>
        <p className="text-sm text-text-secondary mt-0.5">
          {isLocked ? "Exclusivo Premium" : description}
        </p>
      </div>
      <ArrowRight className={cn("w-5 h-5 ml-4 shrink-0", isLocked ? "text-gray-400" : "text-primary")} />
    </div>
  );
};

export default NavCardItem;