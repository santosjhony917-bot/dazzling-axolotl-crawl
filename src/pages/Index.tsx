import React from 'react';
import { Link } from 'react-router-dom';

const Index: React.FC = () => {
  return (
    <div className="p-8 max-w-md mx-auto text-center">
      <h1 className="text-3xl font-bold text-primary mb-6">Página Inicial (Index)</h1>
      <p className="text-lg text-text-secondary mb-8">Navegação de Teste</p>
      
      <div className="space-y-4">
        <Link to="/welcome" className="block w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 transition">
          Ir para Welcome
        </Link>
        <Link to="/auth" className="block w-full bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-600 transition">
          Ir para Auth (Login/Cadastro Cliente)
        </Link>
        <Link to="/restaurant-area-hub" className="block w-full border border-gray-500 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-100 transition">
          Área do Restaurante
        </Link>
        <Link to="/terms-and-privacy" className="block w-full text-sm text-gray-500 mt-4 hover:underline">
          Termos e Privacidade
        </Link>
      </div>
    </div>
  );
};

export default Index;