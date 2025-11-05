import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Upload } from 'lucide-react';

export default function ImportMenu() {
  return (
    <Card className="shadow-soft-lg border-none rounded-xl bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl text-[#022D68]">
          <Upload className="w-6 h-6" /> Importar Cardápio (CSV)
        </CardTitle>
        <CardDescription>Importe itens de menu em massa usando um arquivo CSV.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">Funcionalidade de upload, parser e preview de CSV será implementada aqui.</p>
      </CardContent>
    </Card>
  );
}