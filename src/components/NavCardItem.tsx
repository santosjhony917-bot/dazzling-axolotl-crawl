import React from 'react';
import { LucideIcon, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavCardItemProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
  isLocked?: boolean; // Adicionando a prop isLocked
  className?: string;
}

const NavCardItem: React.FC<NavCardItemProps> = ({ icon: Icon, title, description, onClick, isLocked = false, className }) => {
  return (
    <div
      className={cn(
        "flex items-center p-4 bg-white rounded-xl shadow-soft-md cursor-pointer transition-all hover:shadow-soft-lg",
        isLocked && "opacity-60 cursor-not-allowed bg-gray-50",
        className
      )}
      onClick={isLocked ? undefined : onClick}
    >
      <div className="flex-shrink-0 p-3 bg-highlight/10 rounded-full text-highlight mr-4">
        <Icon size={24} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-base font-semibold text-primary truncate">{title}</h3>
        <p className="text-sm text-text-secondary mt-0.5">
          {isLocked ? "Exclusivo Premium" : description}
        </p>
      </div>
      {isLocked && (
        <div className="ml-4 flex-shrink-0 text-gray-500">
          <Lock size={20} />
        </div>
      )}
    </div>
  );
};

export default NavCardItem;