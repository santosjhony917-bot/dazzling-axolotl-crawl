"use client";

import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '../hooks/useAuth'; // Import useAuth

const SharedLayoutWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoggedIn, isRestaurantOwner, isAdmin } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-white shadow p-4">
        <div className="container mx-auto flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold text-[#E47948]">
            FoodApp
          </Link>
          <nav className="space-x-4">
            {isLoggedIn && (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/home">Home</Link>
                </Button>
                <Button variant="ghost" asChild>
                  <Link to="/profile">Perfil</Link>
                </Button>
                <Button variant="ghost" asChild>
                  <Link to="/settings">Configurações</Link>
                </Button>
                {isRestaurantOwner && (
                  <Button variant="ghost" asChild>
                    <Link to="/dashboard">Dashboard Restaurante</Link>
                  </Button>
                )}
                {isAdmin && (
                  <Button variant="ghost" asChild>
                    <Link to="/admin/dashboard">Admin</Link>
                  </Button>
                )}
              </>
            )}
            {!isLoggedIn && (
              <Button variant="ghost" asChild>
                <Link to="/login">Login</Link>
              </Button>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-grow container mx-auto p-4">
        {children} {/* Isso renderizará o Outlet */}
      </main>
      <footer className="bg-gray-200 p-4 text-center text-gray-600">
        <p>&copy; {new Date().getFullYear()} FoodApp. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};

export default SharedLayoutWrapper;