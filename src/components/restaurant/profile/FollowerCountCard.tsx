import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FollowerCountCardProps {
  count: number;
}

const FollowerCountCard: React.FC<FollowerCountCardProps> = ({ count }) => {
  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-500" />
            <p className="text-sm text-gray-500">Seguidores</p>
          </div>
          <div className={cn(
            "flex items-center gap-1 text-sm font-semibold",
            "text-gray-700"
          )}>
            {count}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FollowerCountCard;