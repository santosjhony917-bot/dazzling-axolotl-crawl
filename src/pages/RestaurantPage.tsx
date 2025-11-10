"use client";

import React from 'react';
import { useParams } from 'react-router-dom';

const RestaurantPage = () => {
  const { id } = useParams();

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold">Página do Restaurante</h1>
      <p>Detalhes do restaurante com ID: {id}</p>
      <p>Esta é uma página de placeholder.</p>
    </div>
  );
};

export default RestaurantPage;