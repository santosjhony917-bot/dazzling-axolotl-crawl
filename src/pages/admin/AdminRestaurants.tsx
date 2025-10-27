import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Utensils } from 'lucide-react';

export default function AdminRestaurants() {
  return (
    <Card className="shadow-soft-lg border-none rounded-xl bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl text-[#022D68]">
          <Utensils className="w-6 h-6" /> Gerenciar Restaurantes
        </CardTitle>
        <CardDescription>Busca e visualização detalhada de restaurantes cadastrados.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">Funcionalidade de busca, filtros e visualização detalhada de restaurantes será implementada aqui.</p>
      </CardContent>
    </Card>
  );
}