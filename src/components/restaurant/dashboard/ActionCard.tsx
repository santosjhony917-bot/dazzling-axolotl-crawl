import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface ActionCardProps {
  title: string;
  icon: LucideIcon;
  onClick: () => void;
}

const ActionCard: React.FC<ActionCardProps> = ({ title, icon: Icon, onClick }) => {
  const lines = title.split('|');

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="flex-1"
      onClick={onClick}
    >
      <Card 
        className="w-full cursor-pointer transition-shadow duration-200 rounded-xl border-none shadow-soft-md"
      >
        <CardContent className="p-4 flex flex-col items-center text-center">
          <div className="mb-2">
            <Button 
              size="icon" 
              className="h-12 w-12 rounded-full bg-highlight hover:bg-highlight/90 text-white shadow-highlight-glow"
            >
              <Icon className="h-6 w-6" />
            </Button>
          </div>
          <p className="text-sm font-semibold text-primary leading-tight">
            {lines.map((line, index) => (
              <React.Fragment key={index}>
                {line.trim()}
                {index < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ActionCard;