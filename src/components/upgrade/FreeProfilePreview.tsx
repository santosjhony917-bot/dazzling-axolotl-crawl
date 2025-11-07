import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Phone, Clock, Info, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

const FreeProfilePreview: React.FC = () => {
  return (
    <Card className="relative w-full max-w-md mx-auto rounded-xl overflow-hidden shadow-lg border-2 border-gray-200 bg-white">
      {/* Header Section - Simplified */}
      <div className="relative h-24 bg-gray-300 flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-t from-gray-400/50 to-transparent" />
        <div className="relative z-10 w-20 h-20 rounded-full bg-gray-500 flex items-center justify-center border-4 border-white -mb-10">
          <Lock className="w-10 h-10 text-gray-300" />
        </div>
      </div>

      {/* Main Content */}
      <CardContent className="pt-12 pb-6 px-4 text-center">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Nome do Restaurante (Free)</h2>
        <p className="text-sm text-gray-600 mb-4">
          Uma breve descrição do seu restaurante. No plano Free, o destaque é limitado.
        </p>

        <div className="space-y-3 text-left text-sm text-gray-700">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-500 shrink-0" />
            <span>Endereço do Restaurante, Cidade - UF</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500 shrink-0" />
            <span>Horário de Funcionamento: 18:00 - 23:00</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-gray-500 shrink-0" />
            <span>(XX) XXXX-XXXX</span>
          </div>
        </div>

        <Button variant="outline" className="w-full mt-6 text-gray-600 border-gray-300 hover:bg-gray-50">
          Ver Cardápio Básico
        </Button>
        <p className="text-xs text-gray-500 mt-2">
          Funcionalidades limitadas para o plano gratuito.
        </p>
      </CardContent>
    </Card>
  );
};

export default FreeProfilePreview;