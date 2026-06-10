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
  flat?: boolean;
}

const InfoCardItem: React.FC<InfoCardItemProps> = ({ 
  label, 
  value, 
  icon: Icon, 
  onClick, 
  isPremiumFeature = false, 
  isPremium = false,
  extraContent,
  flat = false
}) => {
  
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!(isPremiumFeature && !isPremium)) {
      onClick();
    }
  };

  const isLocked = isPremiumFeature && !isPremium;

  return (
    <div 
      className={cn(
        flat 
          ? "flex items-center gap-3 py-3 border-b border-slate-100 last:border-b-0 bg-transparent shadow-none rounded-none w-full relative" 
          : "profile-data-block"
      )} 
      onClick={handleEditClick} 
      style={{ cursor: isLocked ? 'not-allowed' : 'pointer', opacity: isLocked ? 0.7 : 1 }}
    >
      <div className={cn(flat ? "text-slate-400 flex-shrink-0" : "profile-data-icon")}>
        <Icon className="w-5 h-5 stroke-[1.5]" />
      </div>
      <div className={cn(flat ? "flex flex-col flex-grow min-w-0" : "profile-data-text")}>
        <span className={cn(flat ? "text-xs text-slate-400" : "profile-data-label")}>{label}</span>
        {(value !== null || !extraContent) && (
          <span className={cn(flat ? "text-sm font-semibold text-slate-800" : "profile-data-value")}>
            {isLocked ? "Exclusivo Premium" : (value || "Não definido")}
          </span>
        )}
        {extraContent}
      </div>
      <div 
        className={cn(flat ? "text-slate-400 flex-shrink-0" : "profile-data-icon")} 
        style={{ cursor: isLocked ? 'not-allowed' : 'pointer', color: isLocked ? 'var(--text-muted)' : 'var(--highlight)' }} 
        onClick={handleEditClick}
      >
        {isLocked ? <Lock className="w-4 h-4 stroke-[1.5]" /> : <Edit className="w-4 h-4 stroke-[1.5]" />}
      </div>
    </div>
  );
};

export default InfoCardItem;