import React from 'react';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion'; // Adicionando motion

interface NavCardItemProps {
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  description: string;
}

const NavCardItem: React.FC<NavCardItemProps> = ({ label, icon: Icon, onClick, description }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={cn(
        "w-full p-4 flex items-center justify-between transition-all cursor-pointer",
        // Estilo Hub: Fundo cinza claro, arredondado, sombra sutil
        "bg-[#f5f7f8] border border-gray-200 rounded-xl shadow-sm hover:shadow-md",
        "dark:bg-gray-800 dark:hover:bg-gray-700"
      )}
    >
      <div className="flex items-center gap-4">
        {/* Ícone Circular de Fundo Claro (Estilo Hub) */}
        <div className="w-10 h-10 bg-[#022D68]/10 rounded-full flex items-center justify-center shrink-0 text-[#022D68] dark:bg-gray-700">
          <Icon className="w-5 h-5" />
        </div>
        
        {/* Texto */}
        <div className="flex-1">
          <p className="text-base font-bold text-[#022D68] leading-snug">
            {label}
          </p>
          <p className="text-sm text-gray-600 mt-0.5">
            {description}
          </p>
        </div>
      </div>
      
      {/* Seta de Navegação (ArrowLeft com rotate-180) */}
      <ArrowLeft className="w-5 h-5 text-gray-500 rotate-180 shrink-0" />
    </motion.div>
  );
};

export default NavCardItem;