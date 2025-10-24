import React from 'react';
import { Crown, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Subscription() {
  return (
    <div className="p-4 space-y-6">
      <h1 className="text-3xl font-bold text-[#022D68] flex items-center">
        <Crown className="w-7 h-7 mr-3 text-[#E47948]" />
        Gerenciar Assinatura
      </h1>
      
      <Card className="border-2 border-[#E47948] shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-[#022D68]">Seu Plano Atual: Premium</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">Você tem acesso a todos os recursos avançados, incluindo Cardápio Detalhado, Galeria de Fotos e Análises.</p>
          <div className="space-y-2">
            <div className="flex items-center text-green-600">
              <CheckCircle className="w-5 h-5 mr-2" />
              <span>Cardápio Completo</span>
            </div>
            <div className="flex items-center text-green-600">
              <CheckCircle className="w-5 h-5 mr-2" />
              <span>Galeria de Fotos</span>
            </div>
            <div className="flex items-center text-green-600">
              <CheckCircle className="w-5 h-5 mr-2" />
              <span>Gerenciamento de Pedidos (Mock)</span>
            </div>
          </div>
          <Button className="bg-[#022D68] hover:bg-[#022D68]/90 text-white">
            Gerenciar Pagamento
          </Button>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-[#022D68]">Plano Free</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">Acesso básico com perfil público limitado.</p>
          <div className="space-y-2">
            <div className="flex items-center text-red-600">
              <XCircle className="w-5 h-5 mr-2" />
              <span>Cardápio Completo</span>
            </div>
            <div className="flex items-center text-green-600">
              <CheckCircle className="w-5 h-5 mr-2" />
              <span>Informações Básicas</span>
            </div>
          </div>
          <Button variant="outline" disabled>
            Fazer Downgrade
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}