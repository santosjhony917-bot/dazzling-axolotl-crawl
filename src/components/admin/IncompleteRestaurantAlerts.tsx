import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Utensils, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const IncompleteRestaurantAlerts: React.FC = () => {
  // Mock data for demonstration
  const incompleteCount: number = 5; // Use const with explicit type to avoid TS2367 and prefer-const
  const missingData = [
    { id: 'r1', name: 'Restaurante A', missing: 'Endereço e Horários' },
    { id: 'r2', name: 'Restaurante B', missing: 'Cardápio' },
  ];

  // Using the variable to avoid TS2367 error caused by comparing literal types
  if (incompleteCount === 0) return null;

  return (
    <Card className="shadow-soft-lg border-none rounded-xl bg-white">
      <CardContent className="p-4">
        <Alert className="bg-red-50 border-red-400 text-red-700">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Atenção: {incompleteCount} Restaurantes Incompletos</AlertTitle>
          <AlertDescription className="mt-2 space-y-1">
            <p>Os seguintes restaurantes precisam de dados adicionais para serem exibidos:</p>
            <ul className="list-disc list-inside ml-4 text-sm">
              {missingData.map((item, index) => (
                <li key={index} className="font-medium">{item.name}: <span className="font-normal">{item.missing}</span></li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default IncompleteRestaurantAlerts;