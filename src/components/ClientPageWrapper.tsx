import React, { ReactNode } from 'react';
import ClientBottomNav from './ClientBottomNav';
import { cn } from '@/lib/utils';

interface ClientPageWrapperProps {
  children: ReactNode;
  className?: string;
  // selectedTab: 'home' | 'favorites' | 'search' | 'profile'; // Removido
}

/**
 * Layout wrapper para páginas de cliente que precisam da navegação inferior.
 */
export default function ClientPageWrapper({ children, className }: ClientPageWrapperProps) {
  // A lógica de ativação da aba agora é interna ao ClientBottomNav
  // baseada na rota atual (location.pathname).
  
  return (
    <div className={cn("min-h-screen flex flex-col bg-gray-50", className)}>
      <main className="flex-1 w-full max-w-md mx-auto pb-16">
        {children}
      </main>
      <ClientBottomNav />
    </div>
  );
}