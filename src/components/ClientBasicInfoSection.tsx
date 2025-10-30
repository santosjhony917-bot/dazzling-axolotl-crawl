"use client";

import React from 'react';
import { Label } from '@/components/ui/label';
import { InfoCardItem } from '@/components/InfoCardItem';
import { Profile } from '@/types/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Phone } from 'lucide-react';

interface ClientBasicInfoSectionProps {
  profile: Profile;
}

export function ClientBasicInfoSection({ profile }: ClientBasicInfoSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Informações Básicas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <InfoCardItem
          label="Nome Completo"
          value={`${profile.first_name || ''} ${profile.last_name || ''}`}
          icon={Mail} // Usando Mail como placeholder, pois o ícone não é usado aqui
          onClick={() => {}}
          editIcon={null}
        />
        <InfoCardItem
          label="Telefone"
          value={profile.phone}
          icon={Phone}
          onClick={() => {}}
          editIcon={null}
        />
      </CardContent>
    </Card>
  );
}