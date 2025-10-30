"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PublicRestaurantData } from '@/types/restaurant';
import { InfoCardItem } from '@/components/InfoCardItem';
import EditFieldDialog from '@/components/EditFieldDialog'; // Assuming this component exists or will be created
import { MessageCircle, Utensils, Globe, Link, Pencil } from 'lucide-react';
import { UpdateRestaurantPayload } from '@/types/payloads';

interface SalesChannelsSectionProps {
  data: {
    whatsapp_url: string | null;
    ifood_url: string | null;
    other_url: string | null;
  } | null;
  isOwner: boolean;
  onUpdate: (payload: UpdateRestaurantPayload) => Promise<void>;
}

export function SalesChannelsSection({ data, isOwner, onUpdate }: SalesChannelsSectionProps) {
  if (!data) return null;

  const handleEdit = (field: keyof UpdateRestaurantPayload, initialValue: string | null) => {
    // Placeholder for modal logic
    console.log(`Editing ${field} with value: ${initialValue}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Canais de Venda</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <InfoCardItem
          label="WhatsApp"
          value={data.whatsapp_url}
          icon={MessageCircle}
          onClick={() => isOwner && handleEdit('whatsapp_url', data.whatsapp_url)}
          editIcon={isOwner ? Pencil : null}
        />
        <InfoCardItem
          label="iFood"
          value={data.ifood_url}
          icon={Utensils}
          onClick={() => isOwner && handleEdit('ifood_url', data.ifood_url)}
          editIcon={isOwner ? Pencil : null}
        />
        <InfoCardItem
          label="Outro Link"
          value={data.other_url}
          icon={Globe}
          onClick={() => isOwner && handleEdit('other_url', data.other_url)}
          editIcon={isOwner ? Pencil : null}
        />
      </CardContent>
    </Card>
  );
}