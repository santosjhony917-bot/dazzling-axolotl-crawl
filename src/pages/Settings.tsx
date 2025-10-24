import React from 'react';
import { Settings as SettingsIcon } from 'lucide-react';

export default function Settings() {
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-3xl font-bold text-[#022D68] flex items-center">
        <SettingsIcon className="w-7 h-7 mr-3 text-[#E47948]" />
        Configurações do Restaurante
      </h1>
      <p className="text-gray-600">Gerencie as informações básicas, endereço e detalhes de contato do seu restaurante.</p>
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Detalhes da Conta</h2>
        <p className="text-gray-500">Funcionalidade de edição de configurações em desenvolvimento.</p>
      </div>
    </div>
  );
}