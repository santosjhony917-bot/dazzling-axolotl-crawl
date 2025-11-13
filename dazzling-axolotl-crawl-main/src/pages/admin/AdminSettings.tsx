import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Settings } from 'lucide-react';

export default function AdminSettings() {
  return (
    <Card className="shadow-soft-lg border-none rounded-xl bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl text-[#022D68]">
          <Settings className="w-6 h-6" /> Configurações do Sistema
        </CardTitle>
        <CardDescription>Ajustes globais e manutenção do sistema.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">Funcionalidade de configurações avançadas será implementada aqui.</p>
      </CardContent>
    </Card>
  );
}