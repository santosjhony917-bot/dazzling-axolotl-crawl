import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface RestaurantAreaHeaderProps {
  title: string;
  // Agora aceita as chaves de rota completas que são usadas
  backPath?: 'restaurantAreaHub' | 'restaurant-area/dashboard' | 'restaurant-area/profile-menu';
  className?: string;
}

/**
 * Header padrão para as páginas da área do restaurante.
 */
export default function RestaurantAreaHeader({ 
  title, 
  backPath = 'restaurant-area/dashboard', 
  className 
}: RestaurantAreaHeaderProps) {
  const navigate = useNavigate();

  const getBackPath = () => {
    // Usamos createPageUrl diretamente com a chave fornecida
    return createPageUrl(backPath);
  };

  return (
    <header className={cn(
      "flex items-center bg-white p-4 justify-start sticky top-0 z-20 shadow-soft-md w-full",
      className
    )}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate(getBackPath())}
        className="text-primary hover:bg-primary/5"
      >
        <ArrowLeft className="h-6 w-6" />
      </Button>
      <h2 className="text-primary text-xl font-bold ml-4 truncate">{title}</h2>
    </header>
  );
}