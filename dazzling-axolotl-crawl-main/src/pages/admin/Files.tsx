import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Folder } from 'lucide-react';

export default function Files() {
  return (
    <Card className="shadow-soft-lg border-none rounded-xl bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl text-[#022D68]">
          <Folder className="w-6 h-6" /> Gerenciamento de Arquivos
        </CardTitle>
        <CardDescription>Gerencie imagens e documentos armazenados nos buckets.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">Funcionalidade de tabs para buckets (Imagens e Documentos) e listagem de arquivos será implementada aqui.</p>
      </CardContent>
    </Card>
  );
}