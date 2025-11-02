import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface RestaurantAreaHeaderProps {
  title: string;
  backTo?: 'home' | 'profile-menu' | 'custom';
  customBackPath?: string;
}

const RestaurantAreaHeader: React.FC<RestaurantAreaHeaderProps> = ({ title, backTo = 'home', customBackPath }) => {
  const navigate = useNavigate();

  const handleBackClick = () => {
    if (customBackPath) {
      navigate(customBackPath);
    } else if (backTo === 'profile-menu') {
      navigate(createPageUrl('restaurant-area-profile-menu'));
    } else {
      navigate(createPageUrl('restaurant-area-home'));
    }
  };

  return (
    <header className="flex items-center p-4 bg-white shadow-sm sticky top-0 z-10">
      <Button variant="ghost" size="icon" onClick={handleBackClick}>
        <ChevronLeft className="h-6 w-6" />
      </Button>
      <h1 className="flex-grow text-center text-xl font-semibold text-primary">{title}</h1>
      <div className="w-10"></div> {/* Placeholder para alinhar o título */}
    </header>
  );
};

export default RestaurantAreaHeader;