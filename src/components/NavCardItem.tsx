import React from 'react';
import { ChevronRight, LucideIcon, Crown, Lock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion'; // Adicionando motion para efeitos de hover/tap

interface NavCardItemProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
  isPremium?: boolean;
  premiumDescription?: string;
  isPremiumFeature?: boolean;
}

const NavCardItem: React.FC<NavCardItemProps> = ({
  icon: Icon,
  title,
  description,
  onClick,
  isPremium = false,
  premiumDescription,
  isPremiumFeature = false,
}) => {
  
  const isLocked = isPremiumFeature && !isPremium;

  const handleClick = (e: React.MouseEvent) => {
    if (isLocked) {
      e.preventDefault();
      // Poderíamos adicionar um toast aqui, mas o componente pai pode lidar com isso.
      return;
    }
    onClick();
  };

  return (
    <motion.div
      whileHover={{ scale: isLocked ? 1 : 1.01 }}
      whileTap={{ scale: isLocked ? 1 : 0.99 }}
      className={cn(
        "flex items-center p-4 cursor-pointer transition-all duration-200 border-none shadow-soft-md",
        isLocked 
          ? "bg-gray-100 opacity-70 cursor-not-allowed" 
          : "bg-white hover:bg-gray-50",
        !isPremium && premiumDescription && "opacity-80" // Mantém a opacidade para o banner de upgrade
      )}
      onClick={handleClick}
    >
      <div className={cn(
        "flex items-center justify-center size-10 rounded-xl mr-4 shrink-0",
        isLocked ? "bg-gray-300 text-gray-500" : "bg-primary/10 text-primary"
      )}>
        <Icon className="w-5 h-5" />
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className="text-base font-semibold text-primary truncate">{title}</h3>
        <p className="text-sm text-text-secondary mt-0.5">
          {isLocked ? "Exclusivo Premium" : description}
        </p>
      </div>
      
      <div className="flex items-center ml-4 shrink-0">
        {isLocked ? (
          <Lock className="w-5 h-5 text-red-500" />
        ) : (
          <>
            {premiumDescription && !isPremium && (
              <div className="flex items-center text-xs font-medium text-highlight bg-highlight/10 px-2 py-1 rounded-full mr-2">
                <Crown className="w-3 h-3 mr-1 fill-highlight" />
                Premium
              </div>
            )}
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </>
        )}
      </div>
    </motion.div>
  );
};

export default NavCardItem;