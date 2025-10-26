import React from 'react';
import { Edit, Lock, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion'; // Adicionando motion para efeitos de hover/tap

interface InfoCardItemProps {
  label: string;
  value: string | null;
  icon: React.ElementType;
  onClick: () => void;
  isPremiumFeature?: boolean;
  isPremium?: boolean;
  extraContent?: React.ReactNode;
}

const InfoCardItem: React.FC<InfoCardItemProps> = ({ 
  label, 
  value, 
  icon: Icon, 
  onClick, 
  isPremiumFeature = false, 
  isPremium = false,
  extraContent
}) => {
  
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!(isPremiumFeature && !isPremium)) {
      onClick();
    }
  };

  const isLocked = isPremiumFeature && !isPremium;

  return (
    <motion.div
      whileHover={{ scale: isLocked ? 1 : 1.01 }}
      whileTap={{ scale: isLocked ? 1 : 0.99 }}
      onClick={handleEditClick}
      className={cn(
        "w-full p-4 flex items-start justify-between transition-all cursor-pointer",
        // Estilo Hub: Fundo branco, arredondado, sombra sutil
        "bg-white border-none rounded-xl shadow-soft-md hover:shadow-soft-lg", // Sombra mais suave
        "dark:bg-gray-800 dark:hover:bg-gray-700",
        isLocked && "opacity-70 cursor-not-allowed hover:shadow-soft-md"
      )}
    >
      <div className="flex items-start gap-4 flex-1">
        {/* Ícone Circular (Estilo Hub) */}
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 text-primary dark:bg-gray-700">
          <Icon className="w-5 h-5" />
        </div>
        
        {/* Texto */}
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-primary leading-snug">
            {label}
          </p>
          <p className={cn("text-sm text-text-secondary mt-0.5", !value && "italic text-gray-400 font-normal")}>
            {value || "Não definido"}
          </p>
          {extraContent}
        </div>
      </div>
      
      {/* Botão de Ação (Edit/Lock) */}
      <Button 
        size="sm" 
        variant="ghost"
        className="h-7 w-7 p-0 text-highlight hover:bg-highlight/10 shrink-0 ml-4 rounded-lg" 
        onClick={handleEditClick}
        disabled={isLocked}
      >
        {isLocked ? <Lock className="h-4 w-4 text-gray-400" /> : <Edit className="h-4 w-4" />}
      </Button>
    </motion.div>
  );
};

export default InfoCardItem;