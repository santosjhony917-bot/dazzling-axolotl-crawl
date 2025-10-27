import React, { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';
import { cn } from '@/lib/utils';
import { useRestaurantContext } from '@/context/RestaurantContext';
import RestaurantAreaHeader from './RestaurantAreaHeader';
import { LucideIcon } from 'lucide-react';

interface RestaurantAreaPageLayoutProps {
  children: ReactNode;
  title: string;
  icon: LucideIcon;
  backPath: 'dashboard' | 'profileMenu' | 'hub';
  className?: string;
  showBottomNav?: boolean;
}

/**
 * Layout base para páginas específicas dentro da área do restaurante (Menu, Galeria, Settings).
 * Inclui um header fixo e o conteúdo principal.
 */
export default function RestaurantAreaPageLayout({ 
  children, 
  title, 
  icon: Icon, 
  backPath, 
  className,
  showBottomNav = false, // Por padrão, páginas de gerenciamento não mostram o nav inferior
}: RestaurantAreaPageLayoutProps) {
  const { restaurant } = useRestaurantContext();
  
  // Se showBottomNav for true, adiciona padding inferior
  const paddingClass = showBottomNav ? 'pb-16' : 'pb-4';

  return (
    <div className={cn("min-h-screen flex flex-col bg-gray-50", className)}>
      <RestaurantAreaHeader 
        title={title} 
        backPath={backPath} 
        className="max-w-md mx-auto w-full"
      />
      
      <main className={cn("flex-1 w-full max-w-md mx-auto", paddingClass)}>
        {children}
      </main>
      
      {/* O BottomNav é gerenciado pelo RestaurantLayout ou pelo componente pai, 
          mas mantemos a opção de exibi-lo se necessário. */}
      {/* {showBottomNav && restaurant && (
        <RestaurantBottomNav isPremium={restaurant.plan === 'premium'} />
      )} */}
    </div>
  );
}