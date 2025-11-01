"use client";

import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const RestaurantManage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-[#022D68] mb-6">Gerenciar Restaurante {id}</h1>
      <p className="mb-4">Esta é a página de gerenciamento do seu restaurante.</p>
      <Button asChild>
        <Link to="/dashboard">Voltar para o Dashboard</Link>
      </Button>
    </div>
  );
};

export default RestaurantManage;