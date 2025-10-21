import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const WelcomePage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 text-center">
      <h1 className="text-4xl font-extrabold text-primary dark:text-white mb-4">Bem-vindo!</h1>
      <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
        Comece a gerenciar seu restaurante agora.
      </p>
      <div className="space-y-4 w-full max-w-xs">
        <Link to="/login">
          <Button className="w-full">Fazer Login</Button>
        </Link>
        <Link to="/restaurant/signup">
          <Button variant="outline" className="w-full">Cadastrar Restaurante</Button>
        </Link>
      </div>
    </div>
  );
};

export default WelcomePage;