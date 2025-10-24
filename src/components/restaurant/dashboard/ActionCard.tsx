import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface ActionCardProps {
  title: string;
  icon: React.ElementType;
  onClick: () => void;
  isPremiumFeature?: boolean;
}

const ActionCard: React.FC<ActionCardProps> = ({ title, icon: Icon, onClick, isPremiumFeature = false }) => {
  return (
    <Card 
      className={cn(
        "flex-1 rounded-xl shadow-md cursor-pointer hover:shadow-lg transition-shadow border-none",
        isPremiumFeature && "opacity-70"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
        <div className="w-10 h-10 rounded-full bg-[#022D68]/10 flex items-center justify-center mb-2">
          <Icon className="w-5 h-5 text-[#022D68]" />
        </div>
        <p className="text-sm font-semibold text-[#022D68] leading-tight">{title}</p>
      </CardContent>
    </Card>
  );
};

export default ActionCard;