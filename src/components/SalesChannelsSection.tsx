"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InfoCardItem } from '@/components/InfoCardItem';
import { LucideIcon } from 'lucide-react';

interface SalesChannelItem {
  label: string;
  value: string | null | undefined;
  icon: LucideIcon;
  onClick: () => void;
}

interface SalesChannelsSectionProps {
  items: SalesChannelItem[];
  isOwner: boolean;
}

export function SalesChannelsSection({ items, isOwner }: SalesChannelsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Canais de Venda</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item, index) => (
          <InfoCardItem
            key={index}
            label={item.label}
            value={item.value}
            icon={item.icon}
            onClick={item.onClick}
            editIcon={isOwner ? undefined : null}
          />
        ))}
      </CardContent>
    </Card>
  );
}