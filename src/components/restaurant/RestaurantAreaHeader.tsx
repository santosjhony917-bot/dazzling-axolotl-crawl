import React from 'react';
import { ArrowLeft, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { createPageUrl, PathKey } from '@/utils/url';
import { cn } from '@/lib/utils';

interface RestaurantAreaHeaderProps {
  title: string;
  icon: LucideIcon;
  backPath: PathKey;
}

const RestaurantAreaHeader: React.FC<RestaurantAreaHeaderProps> = ({ title, icon: Icon, backPath }) => {
  const navigate = useNavigate();
  
  return (
    <header className="flex items-center bg-white p-4 pb-2 justify-between sticky top-0 z-20 shadow-none w-full max-w-md mx-auto">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate(createPageUrl(backPath))}
        className="text-primary hover:bg-primary/5 rounded-lg"
      >
        <ArrowLeft className="h-6 w-6" />
      </Button>
      <div className="flex items-center gap-2">
        <Icon className="h-6 w-6 text-primary" />
        <h2 className="text-primary text-xl font-bold">{title}</h2>
      </div>
      <div className="w-10"></div>
    </header>
  );
};

export default RestaurantAreaHeader;