import React from 'react';
import { Edit, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
    onClick();
  };

  return (
    <Card 
      className={cn(
        "w-full p-4 flex items-start justify-between transition-all cursor-pointer",
        "bg-white border-none rounded-xl shadow-md hover:shadow-lg active:scale-[0.99]",
        "dark:bg-gray-800 dark:hover:bg-gray-700"
      )}
      onClick={handleEditClick}
    >
      <div className="flex items-start gap-4 flex-1">
        {/* Ícone Circular de Fundo Claro (Estilo NavCardItem) */}
        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center shrink-0 text-[#022D68] dark:bg-gray-700">
          <Icon className="w-5 h-5" />
        </div>
        
        {/* Texto */}
        <div className="flex-1 min-w-0">
          {/* Label (Título do campo) - Estilo NavCardItem (Bold, Azul Escuro) */}
          <p className="text-base font-bold text-[#022D68] leading-snug">
            {label}
          </p>
          {/* Value (Valor do campo) - Estilo NavCardItem (Muted/Description) */}
          <p className={cn("text-sm text-muted-foreground mt-0.5", !value && "italic text-gray-400 font-normal")}>
            {value || "Não definido"}
          </p>
          {extraContent}
        </div>
      </div>
      
      {/* Botão de Edição (Mantendo a cor de destaque para a ação) */}
      <Button 
        size="sm" 
        variant="ghost"
        className="h-7 w-7 p-0 text-[#E47948] hover:bg-[#E47948]/10 shrink-0 ml-4" 
        onClick={handleEditClick}
        disabled={isPremiumFeature && !isPremium}
      >
        {isPremiumFeature && !isPremium ? <Lock className="h-4 w-4 text-gray-400" /> : <Edit className="h-4 w-4" />}
      </Button>
    </Card>
  );
};

export default InfoCardItem;