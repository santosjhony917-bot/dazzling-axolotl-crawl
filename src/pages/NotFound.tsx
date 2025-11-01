"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
      <h1 className="text-6xl font-bold text-[#E47948] mb-4">404</h1>
      <p className="text-2xl text-gray-800 mb-6">Página Não Encontrada</p>
      <p className="text-lg text-gray-600 mb-8">
        A página que você está procurando pode ter sido removida, teve seu nome alterado ou está temporariamente indisponível.
      </p>
      <Button asChild>
        <Link to="/">Voltar para a Página Inicial</Link>
      </Button>
    </div>
  );
};

export default NotFound;