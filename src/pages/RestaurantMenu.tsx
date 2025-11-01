"use client";

import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const RestaurantMenu: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-[#022D68] mb-6">Menu do Restaurante {id}</h1>
      <p className="mb-4">Esta é a página para gerenciar o menu do seu restaurante.</p>
      <Button asChild>
        <Link to="/dashboard">Voltar para o Dashboard</Link>
      </Button>
    </div>
  );
};

export default RestaurantMenu;