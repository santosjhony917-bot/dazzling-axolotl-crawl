import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Crown, Loader2 } from 'lucide-react';

const ManagePlans: React.FC = () => {
  return (
    <Card className="shadow-soft-lg border-none rounded-xl bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl text-[#022D68]">
          <Crown className="w-6 h-6" /> Gerenciar Planos
        </CardTitle>
        <CardDescription>Atribuição e gerenciamento de planos de assinatura (Free, Basic, Premium).</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">Funcionalidade de listagem de restaurantes e alteração de planos será implementada aqui.</p>
      </CardContent>
    </Card>
  );
};

export default ManagePlans;