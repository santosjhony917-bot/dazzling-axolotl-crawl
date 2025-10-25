import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ActionCardProps {
  title: string;
  icon: LucideIcon;
  onClick: () => void;
}

const ActionCard: React.FC<ActionCardProps> = ({ title, icon: Icon, onClick }) => {
  const lines = title.split('|');

  return (
    <Card 
      className="flex-1 cursor-pointer hover:shadow-lg transition-shadow duration-200 rounded-xl border-none"
      onClick={onClick}
    >
      <CardContent className="p-4 flex flex-col items-center text-center">
        <div className="mb-2">
          <Button 
            size="icon" 
            className="h-12 w-12 rounded-full bg-[#022D68] hover:bg-[#022D68]/90 text-white shadow-md"
          >
            <Icon className="h-6 w-6" />
          </Button>
        </div>
        <p className="text-sm font-semibold text-[#022D68] leading-tight">
          {lines.map((line, index) => (
            <React.Fragment key={index}>
              {line.trim()}
              {index < lines.length - 1 && <br />}
            </React.Fragment>
          ))}
        </p>
      </CardContent>
    </Card>
  );
};

export default ActionCard;