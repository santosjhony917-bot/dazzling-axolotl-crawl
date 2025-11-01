"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';
import { Restaurant } from '@/types/supabase'; // Assuming Restaurant type is available
import { formatOpeningHours } from '@/utils/formatters'; // Assuming this utility exists

interface OpeningHoursSectionProps {
  restaurant: Restaurant;
}

const OpeningHoursSection: React.FC<OpeningHoursSectionProps> = ({ restaurant }) => {
  // Placeholder for actual opening hours management
  const handleEditOpeningHours = () => {
    alert('Funcionalidade de edição de horário de funcionamento em breve!');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center"><Clock className="mr-2 h-5 w-5" /> Horário de Funcionamento</CardTitle>
        <CardDescription>Defina os horários de abertura e fechamento do seu restaurante.</CardDescription>
      </CardHeader>
      <CardContent>
        {restaurant.opening_hours ? (
          <div dangerouslySetInnerHTML={{ __html: formatOpeningHours(restaurant.opening_hours) }} />
        ) : (
          <p className="text-gray-500">Nenhum horário de funcionamento definido.</p>
        )}
        <Button onClick={handleEditOpeningHours} className="mt-4 w-full bg-[#E47948] hover:bg-[#C2653B]">
          Editar Horário
        </Button>
      </CardContent>
    </Card>
  );
};

export default OpeningHoursSection;