import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Utensils } from 'lucide-react';

const IncompleteRestaurantAlerts: React.FC = () => {
  // Placeholder implementation
  return (
    <Alert className="bg-red-50 border-red-300 text-red-700 shadow-soft-md rounded-xl">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Atenção: 3 Restaurantes Incompletos</AlertTitle>
      <AlertDescription>
        Existem 3 restaurantes que não possuem endereço ou cardápio ativo. Revise as Fases 2 e 3.
      </AlertDescription>
    </Alert>
  );
};

export default IncompleteRestaurantAlerts;