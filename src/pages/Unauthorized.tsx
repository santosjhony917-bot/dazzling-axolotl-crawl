"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Unauthorized: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
      <h1 className="text-6xl font-bold text-red-500 mb-4">Acesso Negado</h1>
      <p className="text-2xl text-gray-800 mb-6">Você não tem permissão para acessar esta página.</p>
      <Button asChild>
        <Link to="/">Voltar para a Página Inicial</Link>
      </Button>
    </div>
  );
};

export default Unauthorized;