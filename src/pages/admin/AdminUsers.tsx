import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users } from 'lucide-react';

export default function AdminUsers() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#022D68]">
          <Users className="w-6 h-6" /> Gerenciar Usuários
        </CardTitle>
        <CardDescription>Gerenciamento de usuários e perfis (clientes e restaurantes).</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">Funcionalidade de busca, edição de perfis e gerenciamento de contas será implementada aqui.</p>
      </CardContent>
    </Card>
  );
}