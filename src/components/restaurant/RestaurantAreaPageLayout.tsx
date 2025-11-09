"use client";

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom'; // Importar useNavigate

interface RestaurantAreaPageLayoutProps {
  children: React.ReactNode;
  title: string;
  icon: React.ElementType;
  showBackButton?: boolean;
}

const RestaurantAreaPageLayout: React.FC<RestaurantAreaPageLayoutProps> = ({
  children,
  title,
  icon: Icon,
  showBackButton = true,
}) => {
  const navigate = useNavigate(); // Inicializar useNavigate

  const handleBackClick = () => {
    navigate('/restaurant-area/profile-menu'); // Redirecionar para a rota específica
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center mb-6">
        {showBackButton && (
          <button onClick={handleBackClick} className="text-gray-500 hover:text-primary transition-colors mr-4">
            <ArrowLeft className="w-6 h-6" />
          </button>
        )}
        <div className="flex items-center space-x-3">
          <Icon className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">{title}</h1>
        </div>
      </div>
      {children}
    </div>
  );
};

export default RestaurantAreaPageLayout;