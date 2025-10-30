"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InfoCardItem } from '@/components/InfoCardItem';
import { FileText, Pencil } from 'lucide-react';
import { UpdateRestaurantPayload } from '@/types/payloads';

interface DocumentsSectionProps {
  data: {
    cnpj: string | null;
  } | null;
  isOwner: boolean;
  onUpdate: (payload: UpdateRestaurantPayload) => Promise<void>;
}

export function DocumentsSection({ data, isOwner, onUpdate }: DocumentsSectionProps) {
  if (!data) return null;

  const handleEdit = (field: keyof UpdateRestaurantPayload, initialValue: string | null) => {
    // Placeholder for modal logic
    console.log(`Editing ${field} with value: ${initialValue}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documentos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <InfoCardItem
          label="CNPJ"
          value={data.cnpj}
          icon={FileText}
          onClick={() => isOwner && handleEdit('cnpj', data.cnpj)}
          editIcon={isOwner ? Pencil : null}
        />
      </CardContent>
    </Card>
  );
}