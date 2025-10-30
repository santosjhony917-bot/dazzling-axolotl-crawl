"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InfoCardItem } from '@/components/InfoCardItem';
import { Clock, Pencil } from 'lucide-react';
import { UpdateRestaurantPayload } from '@/types/payloads';

interface HoursSectionProps {
  data: {
    opening_hours: any | null;
  } | null;
  isOwner: boolean;
  onUpdate: (payload: UpdateRestaurantPayload) => Promise<void>;
}

export function HoursSection({ data, isOwner, onUpdate }: HoursSectionProps) {
  if (!data) return null;

  const hoursSummary = data.opening_hours ? 'Horário definido' : 'Não definido';

  const handleEditHours = () => {
    // Placeholder for modal logic
    console.log('Editing hours');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Horário de Funcionamento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <InfoCardItem
          label="Horário"
          value={hoursSummary}
          icon={Clock}
          onClick={() => isOwner && handleEditHours()}
          editIcon={isOwner ? Pencil : null}
        />
      </CardContent>
    </Card>
  );
}