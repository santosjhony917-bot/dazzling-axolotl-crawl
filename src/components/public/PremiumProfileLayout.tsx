import React from 'react';
import { Restaurant } from '@/types/supabase';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Crown } from 'lucide-react';

interface PremiumProfileLayoutProps {
  restaurant: Restaurant;
}

const PremiumProfileLayout: React.FC<PremiumProfileLayoutProps> = ({ restaurant }) => {
  return (
    <div className="bg-gray-100 min-h-screen p-4">
      <Alert className="bg-yellow-100 border-yellow-400 text-yellow-800">
        <Crown className="h-4 w-4" />
        <AlertTitle>Perfil Premium</AlertTitle>
        <AlertDescription>
          Este é o layout Premium para {restaurant.name}. Implementação completa pendente.
        </AlertDescription>
      </Alert>
      {/* Conteúdo Premium futuro */}
    </div>
  );
};

export default PremiumProfileLayout;