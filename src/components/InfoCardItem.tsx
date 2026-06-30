import React from 'react';
import { Edit, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  flat = false,
}) => {
  const isLocked = isPremiumFeature && !isPremium;

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLocked) {
      onClick();
    }
  };

  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center gap-3 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2',
        flat
          ? 'border-b border-slate-100 bg-transparent py-3 last:border-b-0'
          : 'rounded-[20px] border border-slate-100 bg-white p-4 shadow-soft hover:translate-y-[-1px]'
      )}
      onClick={handleEditClick}
      disabled={isLocked}
      style={{ cursor: isLocked ? 'not-allowed' : 'pointer', opacity: isLocked ? 0.68 : 1 }}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400">
        <Icon className="h-[18px] w-[18px] stroke-[1.7]" />
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-xs font-normal text-text-secondary">{label}</span>
        {(value !== null || !extraContent) && (
          <span className="truncate text-sm font-semibold text-[#3C2F2F]">
            {isLocked ? 'Exclusivo Premium' : value || 'Não definido'}
          </span>
        )}
        {extraContent}
      </span>

      <span className={cn('shrink-0', isLocked ? 'text-slate-300' : 'text-highlight')}>
        {isLocked ? <Lock className="h-4 w-4 stroke-[1.7]" /> : <Edit className="h-4 w-4 stroke-[1.7]" />}
      </span>
    </button>
  );
};

export default InfoCardItem;
