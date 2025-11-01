"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const AdminLogin: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
      <h1 className="text-3xl font-bold text-[#022D68] mb-4">Login do Administrador</h1>
      <p className="text-lg text-gray-600 mb-8">
        Esta é uma página placeholder para o login do administrador.
      </p>
      <Button asChild>
        <Link to="/login">Ir para Login Comum</Link>
      </Button>
    </div>
  );
};

export default AdminLogin;