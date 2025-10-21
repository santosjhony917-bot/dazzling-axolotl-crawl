import { Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function RestaurantProfilePreviewPremium() {
  return (
    <div className="p-6 bg-white rounded-xl shadow-lg border border-yellow-300/50">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Prévia do Perfil Premium</h2>
      <p className="text-gray-600 mb-6">Veja como seu restaurante aparecerá para os clientes com o plano Premium.</p>

      <div className="space-y-6">
        {/* Destaque Premium */}
        <div className="mt-8">
          <div className="flex items-center gap-3 rounded-lg bg-gradient-to-r from-yellow-400 to-amber-500 p-3 shadow-lg">
            <Crown className="w-6 h-6 text-white fill-white" />
            <p className="font-bold text-white text-lg drop-shadow-md">Cardápio Premium</p>
          </div>
        </div>

        {/* Exemplo de Cardápio */}
        <div className="border border-gray-200 rounded-lg p-4 space-y-3">
          <h3 className="text-xl font-semibold text-gray-700">Pratos em Destaque</h3>
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gray-300 rounded-md flex-shrink-0"></div>
            <div>
              <p className="font-medium text-gray-800">Salmão Grelhado</p>
              <p className="text-sm text-gray-500">Acompanha purê de batatas trufado.</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gray-300 rounded-md flex-shrink-0"></div>
            <div>
              <p className="font-medium text-gray-800">Risoto de Camarão</p>
              <p className="text-sm text-gray-500">Arroz arbóreo e camarões frescos.</p>
            </div>
          </div>
        </div>

        {/* Botão de Ação */}
        <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white">
          Ativar Plano Premium Agora
        </Button>
      </div>
    </div>
  );
}