import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface RestaurantInfoCardProps {
  id: string;
  title: string;
  icon: LucideIcon;
  content: React.ReactNode;
}

const RestaurantInfoCard: React.FC<RestaurantInfoCardProps> = ({ id, title, icon: Icon, content }) => {
  return (
    <Card id={id} className="shadow-md">
      <CardHeader className="flex flex-row items-center space-x-3 p-4 border-b">
        <Icon className="w-6 h-6 text-primary" />
        <CardTitle className="text-xl font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {content}
      </CardContent>
    </Card>
  );
};

export default RestaurantInfoCard;