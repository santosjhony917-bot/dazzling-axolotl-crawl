"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InfoCardItem } from '@/components/InfoCardItem';
import { Building2, UtensilsCrossed, Pencil } from 'lucide-react';
import { UpdateRestaurantPayload } from '@/types/payloads';

interface GeneralInfoSectionProps {
  data: {
    name: string;
    description: string | null;
    category: string | null;
  } | null;
  isOwner: boolean;
  onUpdate: (payload: UpdateRestaurantPayload) => Promise<void>;
}

export function GeneralInfoSection({ data, isOwner, onUpdate }: GeneralInfoSectionProps) {
  if (!data) return null;

  const handleEdit = (field: keyof UpdateRestaurantPayload, initialValue: string | null) => {
    // Placeholder for modal logic
    console.log(`Editing ${field} with value: ${initialValue}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informações Gerais</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <InfoCardItem
          label="Nome do Restaurante"
          value={data.name}
          icon={Building2}
          onClick={() => isOwner && handleEdit('name', data.name)}
          editIcon={isOwner ? Pencil : null}
        />
        <InfoCardItem
          label="Descrição"
          value={data.description}
          icon={UtensilsCrossed}
          onClick={() => isOwner && handleEdit('description', data.description)}
          editIcon={isOwner ? Pencil : null}
        />
        <InfoCardItem
          label="Categoria"
          value={data.category}
          icon={UtensilsCrossed}
          onClick={() => isOwner && handleEdit('category', data.category)}
          editIcon={isOwner ? Pencil : null}
        />
      </CardContent>
    </Card>
  );
}