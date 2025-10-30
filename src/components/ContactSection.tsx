"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InfoCardItem } from '@/components/InfoCardItem';
import { Phone, Mail, Pencil } from 'lucide-react';
import { UpdateRestaurantPayload } from '@/types/payloads';

interface ContactSectionProps {
  data: {
    phone: string | null;
    email: string | null;
  } | null;
  isOwner: boolean;
  onUpdate: (payload: UpdateRestaurantPayload) => Promise<void>;
}

export function ContactSection({ data, isOwner, onUpdate }: ContactSectionProps) {
  if (!data) return null;

  const handleEdit = (field: keyof UpdateRestaurantPayload, initialValue: string | null) => {
    // Placeholder for modal logic
    console.log(`Editing ${field} with value: ${initialValue}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contato</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <InfoCardItem
          label="Telefone"
          value={data.phone}
          icon={Phone}
          onClick={() => isOwner && handleEdit('phone', data.phone)}
          editIcon={isOwner ? Pencil : null}
        />
        <InfoCardItem
          label="Email"
          value={data.email}
          icon={Mail}
          onClick={() => isOwner && handleEdit('email', data.email)}
          editIcon={isOwner ? Pencil : null}
        />
      </CardContent>
    </Card>
  );
}