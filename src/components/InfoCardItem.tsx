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
    // Note: A lógica de navegação para upgrade deve ser tratada no componente pai (RestaurantProfileMenu)
    // ou o onClick deve ser ajustado para receber a navegação. Por simplicidade, vamos manter a chamada onClick.
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
        {/* Ícone Circular de Fundo Claro (Cor de destaque: #E47948) */}
        <div className="w-10 h-10 bg-[#E47948]/10 rounded-full flex items-center justify-center shrink-0 text-[#E47948]">
          <Icon className="w-5 h-5" />
        </div>
        
        {/* Texto */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className={cn("text-base text-foreground mt-0.5 leading-snug", !value && "italic text-gray-400 font-normal")}>
            {value || "Não definido"}
          </p>
          {extraContent}
        </div>
      </div>
      
      {/* Botão de Edição */}
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