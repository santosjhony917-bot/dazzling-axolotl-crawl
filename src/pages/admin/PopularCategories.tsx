import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Settings } from 'lucide-react';

export default function PopularCategories() {
  return (
    <Card className="shadow-soft-lg border-none rounded-xl bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl text-[#022D68]">
          <Settings className="w-6 h-6" /> Categorias Populares
        </CardTitle>
        <CardDescription>Gerencie quais categorias de pratos aparecem em destaque para os clientes.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">Funcionalidade de listagem e toggle de visibilidade de categorias será implementada aqui.</p>
      </CardContent>
    </Card>
  );
}