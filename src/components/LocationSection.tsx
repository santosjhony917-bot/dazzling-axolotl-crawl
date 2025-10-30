"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InfoCardItem } from '@/components/InfoCardItem';
import { MapPin, Pencil } from 'lucide-react';
import { UpdateRestaurantPayload } from '@/types/payloads';

interface LocationSectionProps {
  data: {
    address: string | null;
    number: string | null;
    neighborhood: string | null;
    city: string | null;
    state: string | null;
    cep: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
  isOwner: boolean;
  onUpdate: (payload: UpdateRestaurantPayload) => Promise<void>;
}

export function LocationSection({ data, isOwner, onUpdate }: LocationSectionProps) {
  if (!data) return null;

  const addressSummary = [data.address, data.number, data.neighborhood, data.city, data.state, data.cep]
    .filter(Boolean)
    .join(', ');

  const handleEditLocation = () => {
    // Placeholder for modal logic
    console.log('Editing location');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Localização</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <InfoCardItem
          label="Endereço Completo"
          value={addressSummary || 'Não definido'}
          icon={MapPin}
          onClick={() => isOwner && handleEditLocation()}
          editIcon={isOwner ? Pencil : null}
        />
      </CardContent>
    </Card>
  );
}