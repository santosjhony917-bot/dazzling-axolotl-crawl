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
        className="w-full cursor-pointer transition-all duration-200 rounded-2xl border border-slate-100/80 shadow-none hover:border-slate-200 hover:bg-slate-50/20 bg-white"
      >
        <CardContent className="p-4 flex flex-col items-center text-center">
          <div className="mb-2">
            <div 
              className="h-11 w-11 rounded-full bg-[#EF2A39]/10 text-highlight border border-[#EF2A39]/20 flex items-center justify-center shadow-none shrink-0"
            >
              <Icon className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs font-semibold text-slate-700 leading-tight tracking-tight mt-1.5">
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