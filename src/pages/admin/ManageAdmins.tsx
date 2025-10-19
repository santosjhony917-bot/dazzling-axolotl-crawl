import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users } from 'lucide-react';

export default function ManageAdmins() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#022D68]">
          <Users className="w-6 h-6" /> Gerenciar Administradores
        </CardTitle>
        <CardDescription>Adicione ou remova usuários com acesso total ao painel administrativo.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">Funcionalidade de busca e gerenciamento de roles de admin será implementada aqui.</p>
      </CardContent>
    </Card>
  );
}