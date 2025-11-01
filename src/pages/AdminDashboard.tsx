"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const AdminDashboard: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-[#022D68] mb-6">Dashboard do Administrador</h1>
      <p className="mb-4">Bem-vindo à área de administração!</p>
      <p className="mb-4">Aqui você pode gerenciar usuários, restaurantes e outras configurações do sistema.</p>
      <Button asChild>
        <Link to="/">Voltar para a Home</Link>
      </Button>
    </div>
  );
};

export default AdminDashboard;