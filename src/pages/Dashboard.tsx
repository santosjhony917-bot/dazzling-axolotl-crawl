"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '../hooks/useAuth'; // Corrected import path

const Dashboard: React.FC = () => {
  const { user, restaurant, isLoading, isRestaurantOwner } = useAuth();

  if (isLoading) {
    return <div className="container mx-auto p-4">Carregando dashboard...</div>;
  }

  if (!user) {
    return <div className="container mx-auto p-4">Por favor, faça login para acessar o dashboard.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-[#022D68]">Dashboard</h1>
      <p className="mb-4">Bem-vindo, {user.email}!</p>

      {isRestaurantOwner && restaurant ? (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Seu Restaurante: {restaurant.name}</h2>
          <p>Plano: {restaurant.plan}</p>
          <Button asChild className="mt-4">
            <Link to={`/restaurant/${restaurant.id}/manage`}>Gerenciar Restaurante</Link>
          </Button>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Você não possui um restaurante cadastrado.</h2>
          <p>Gostaria de cadastrar um novo restaurante?</p>
          <Button asChild className="mt-4">
            <Link to="/register-restaurant">Cadastrar Restaurante</Link>
          </Button>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Outras Opções</h2>
        <Button asChild variant="outline" className="mr-4">
          <Link to="/profile">Ver Perfil</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/settings">Configurações</Link>
        </Button>
      </div>
    </div>
  );
};

export default Dashboard;