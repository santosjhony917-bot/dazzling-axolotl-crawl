import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Phone, Clock, Link } from 'lucide-react';

const RestaurantProfilePreviewFree: React.FC = () => {
  return (
    <Card className="overflow-hidden shadow-lg max-w-md mx-auto bg-white dark:bg-gray-800">
      <div className="p-4">
        {/* Nome */}
        <h3 className="text-xl font-bold text-primary dark:text-white mb-3">Restaurante Free Exemplo</h3>

        {/* Informações de Contato e Localização */}
        <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300 mb-4">
          <div className="flex items-center">
            <MapPin className="w-4 h-4 text-gray-500 mr-2 flex-shrink-0" />
            <span>Rua Exemplo, 123 - Centro, Cidade/UF</span>
          </div>
          <div className="flex items-center">
            <Phone className="w-4 h-4 text-gray-500 mr-2 flex-shrink-0" />
            <span>(99) 99999-9999</span>
          </div>
          <div className="flex items-center">
            <Clock className="w-4 h-4 text-gray-500 mr-2 flex-shrink-0" />
            <span>Horário de funcionamento não exibido</span>
          </div>
        </div>

        {/* Link de Contato Básico */}
        <div className="flex gap-2 mb-4">
          <Button variant="outline" size="sm" className="text-xs h-7 border-gray-300 dark:border-gray-600">
            <Link className="w-3 h-3 mr-1" /> WhatsApp
          </Button>
        </div>

        {/* Descrição */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
          Descrição básica do restaurante. O perfil Free tem informações limitadas.
        </p>

        {/* Cardápio Simples */}
        <div className="mb-4">
          <h4 className="font-semibold text-primary dark:text-white mb-2">Cardápio (Simples)</h4>
          <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 ml-2">
            <li>Prato 1 - R$ 25,00</li>
            <li>Prato 2 - R$ 35,00</li>
            <li>Prato 3 - R$ 15,00</li>
          </ul>
        </div>
      </div>
    </Card>
  );
};

export default RestaurantProfilePreviewFree;