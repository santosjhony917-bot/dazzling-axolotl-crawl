import React from 'react';
import { ChevronRight, ArrowLeft, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { showInfo } from '@/utils/toast';

interface NavCardItemProps {
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  description: string;
  isPremiumFeature?: boolean;
  isPremium?: boolean;
}

const NavCardItem: React.FC<NavCardItemProps> = ({ label, icon: Icon, onClick, description, isPremiumFeature = false, isPremium = false }) => {
  
  const isLocked = isPremiumFeature && !isPremium;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLocked) {
      showInfo("Recurso Premium. Faça upgrade para desbloquear.");
    } else {
      onClick();
    }
  };

  return (
    <motion.div
      whileHover={{ scale: isLocked ? 1 : 1.01 }}
      whileTap={{ scale: isLocked ? 1 : 0.99 }}
      onClick={handleClick}
      className={cn(
        "w-full p-4 flex items-center justify-between transition-all",
        "bg-white border-none rounded-xl shadow-sm hover:shadow-md",
        "dark:bg-gray-800 dark:hover:bg-gray-700",
        isLocked ? "opacity-70 cursor-not-allowed hover:shadow-sm" : "cursor-pointer"
      )}
    >
      <div className="flex items-center gap-4">
        {/* Ícone Circular de Fundo Claro (Estilo Hub) */}
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 text-primary dark:bg-gray-700">
          <Icon className="w-5 h-5" />
        </div>
        
        {/* Texto */}
        <div className="flex-1">
          <p className="text-base font-bold text-primary leading-snug">
            {label}
          </p>
          <p className="text-sm text-text-secondary mt-0.5">
            {description}
          </p>
        </div>
      </div>
      
      {/* Seta de Navegação ou Cadeado */}
      {isLocked ? (
        <Lock className="w-5 h-5 text-gray-400 shrink-0" />
      ) : (
        <ArrowLeft className="w-5 h-5 text-gray-500 rotate-180 shrink-0" />
      )}
    </motion.div>
  );
};

export default NavCardItem;