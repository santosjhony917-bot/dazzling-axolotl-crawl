import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { ArrowUpRight, TrendingUp, Users, DollarSign, Utensils } from 'lucide-react';

interface HighlightItem {
  id: string;
  title: string;
  value: string;
  change: string;
  icon: 'sales' | 'views' | 'followers' | 'items';
  color: 'green' | 'blue' | 'orange' | 'purple';
}

interface HighlightCardProps {
  item: HighlightItem;
}

const iconMap = {
  sales: DollarSign,
  views: TrendingUp,
  followers: Users,
  items: Utensils,
};

const colorMap = {
  green: {
    bg: 'bg-green-500/10',
    text: 'text-green-600',
    iconBg: 'bg-green-500',
  },
  blue: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-600',
    iconBg: 'bg-blue-500',
  },
  orange: {
    bg: 'bg-highlight/10',
    text: 'text-highlight',
    iconBg: 'bg-highlight',
  },
  purple: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-600',
    iconBg: 'bg-purple-500',
  },
};

const HighlightCard: React.FC<HighlightCardProps> = ({ item }) => {
  const colors = colorMap[item.color];
  const IconComponent = iconMap[item.icon];

  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="w-[180px] flex-shrink-0 cursor-pointer"
    >
      <Card className="rounded-2xl shadow-soft-lg border-none transition-all duration-300 hover:shadow-soft-xl">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className={cn("size-8 rounded-lg flex items-center justify-center text-white shadow-md", colors.iconBg)}>
              <IconComponent className="w-4 h-4" />
            </div>
            <div className="flex items-center text-xs font-semibold text-green-600">
              <ArrowUpRight className="w-3 h-3 mr-0.5" />
              {item.change}
            </div>
          </div>
          
          <p className="text-sm text-gray-500 font-medium truncate">{item.title}</p>
          
          <h3 className="text-2xl font-extrabold text-primary leading-none">
            {item.value}
          </h3>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default HighlightCard;