import React from 'react';
import RestaurantAreaHeader from '@/components/restaurant/RestaurantAreaHeader';
import { BarChart3 } from 'lucide-react';

export default function RestaurantStats() {
  return (
    <div className="relative bg-[#f5f7f8] font-sans antialiased flex min-h-screen w-full flex-col items-center overflow-x-hidden">
      <RestaurantAreaHeader title="Estatísticas" icon={BarChart3} backPath="restaurant-area/home" />
      <main className="flex-1 w-full max-w-md p-4">
        <div className="text-center p-8 bg-white rounded-xl shadow-sm">
          <h2 className="text-xl font-bold text-primary mb-2">Análise de Concorrência</h2>
          <p className="text-gray-600">Funcionalidade de visualização de métricas e concorrentes será implementada aqui.</p>
        </div>
      </main>
    </div>
  );
}