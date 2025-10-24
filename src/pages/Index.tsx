import React from 'react';
import { Link } from 'react-router-dom';

const Index: React.FC = () => {
  return (
    <div className="p-8 max-w-md mx-auto text-center">
      <h1 className="text-3xl font-bold text-primary mb-6">Bem-vindo ao FilterFood</h1>
      <p className="text-lg text-text-secondary mb-8">Página Inicial (Index)</p>
      
      <div className="space-y-4">
        <Link to="/welcome" className="block w-full bg-accent text-white py-3 rounded-lg font-semibold hover:bg-accent/90 transition">
          Ir para Welcome
        </Link>
        <Link to="/login" className="block w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary/90 transition">
          Login Usuário
        </Link>
        <Link to="/restaurant-login" className="block w-full border border-primary text-primary py-3 rounded-lg font-semibold hover:bg-gray-100 transition">
          Login Restaurante
        </Link>
        <Link to="/terms-and-privacy" className="block w-full text-sm text-text-secondary mt-4 hover:underline">
          Termos e Privacidade
        </Link>
      </div>
    </div>
  );
};

export default Index;