import React from 'react';
import { DollarSign, Compass, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SearchActionCardProps {
  title: string;
  icon: LucideIcon;
  iconColor: string; // Tailwind class for icon color
  onClick: () => void;
}

const SearchActionCard: React.FC<SearchActionCardProps> = ({ title, icon: Icon, iconColor, onClick }) => {
  return (
    <Button
      onClick={onClick}
      className="flex-1 h-auto p-4 bg-white text-primary shadow-md hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-xl transition-colors duration-200 border-none"
      variant="ghost"
    >
      <div className="flex flex-col items-center justify-center space-y-2 text-center">
        <Icon className={cn("w-6 h-6", iconColor)} />
        <span className="text-base font-bold leading-snug text-primary dark:text-white">{title}</span>
      </div>
    </Button>
  );
};

interface ClientSearchActionsProps {
  onSearchByPrice: () => void;
  onSearchNearby: () => void;
}

const ClientSearchActions: React.FC<ClientSearchActionsProps> = ({ onSearchByPrice, onSearchNearby }) => {
  return (
    <div className="flex gap-4 pt-2">
      <SearchActionCard
        title="Buscar Prato por Preço"
        icon={DollarSign}
        iconColor="text-highlight" // Laranja
        onClick={onSearchByPrice}
      />
      <SearchActionCard
        title="Buscar Restaurantes Próximos"
        icon={Compass}
        iconColor="text-primary" // Azul Escuro
        onClick={onSearchNearby}
      />
    </div>
  );
};

export default ClientSearchActions;