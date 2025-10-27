import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeftRight } from 'lucide-react';

export default function AdminTransactions() {
  return (
    <Card className="shadow-soft-lg border-none rounded-xl bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl text-[#022D68]">
          <ArrowLeftRight className="w-6 h-6" /> Gerenciar Transações
        </CardTitle>
        <CardDescription>Visualização e gerenciamento de todas as transações financeiras.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">Funcionalidade de listagem e detalhes de transações será implementada aqui.</p>
      </CardContent>
    </Card>
  );
}