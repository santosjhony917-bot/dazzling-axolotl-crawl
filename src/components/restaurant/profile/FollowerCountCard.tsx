import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FollowerCountCardProps {
  followerCount: number;
  isPremium: boolean;
}

const FollowerCountCard: React.FC<FollowerCountCardProps> = ({ followerCount, isPremium }) => {
  const displayCount = followerCount.toLocaleString('pt-BR');
  
  return (
    <Card className="shadow-soft-lg border-none rounded-2xl p-4 bg-white dark:bg-gray-800">
      <CardContent className="p-0 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary/10 text-primary dark:bg-gray-700 shadow-soft-sm">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xl font-bold text-primary leading-snug">{displayCount}</p>
            <p className="text-sm text-gray-600">Seguidores</p>
          </div>
        </div>
        
        <div className={cn(
          "flex items-center gap-1 text-sm font-semibold",
          isPremium ? "text-green-600" : "text-gray-500"
        )}>
          <TrendingUp className="w-4 h-4" />
          {isPremium ? "+15% este mês" : "Dados básicos"}
        </div>
      </CardContent>
    </Card>
  );
};

export default FollowerCountCard;