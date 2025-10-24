import React from 'react';
import { ArrowLeft, LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils/url';

interface RestaurantAreaHeaderProps {
  title: string;
  icon: LucideIcon;
  backPath?: string;
}

const RestaurantAreaHeader: React.FC<RestaurantAreaHeaderProps> = ({ title, icon: Icon, backPath }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backPath) {
      navigate(createPageUrl(backPath));
    } else {
      navigate(-1);
    }
  };

  return (
    <header className="sticky top-0 z-10 bg-white shadow-sm p-4 flex items-center justify-between">
      <Button
        variant="ghost"
        onClick={handleBack}
        className="text-primary hover:bg-primary/5 p-2 h-auto"
      >
        <ArrowLeft className="w-5 h-5" />
      </Button>
      <div className="flex items-center space-x-2 flex-1 justify-center">
        <Icon className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-bold text-[#022D68] truncate">{title}</h1>
      </div>
      <div className="w-10"></div> {/* Placeholder para alinhar o título */}
    </header>
  );
};

export default RestaurantAreaHeader;