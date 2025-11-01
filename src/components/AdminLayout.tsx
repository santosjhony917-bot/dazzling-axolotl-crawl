"use client";

import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '../hooks/useAuth'; // Import useAuth

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoggedIn } = useAuth();

  return (
    <div className="min-h-screen bg-blue-50 flex flex-col">
      <header className="bg-blue-700 text-white shadow p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Admin Dashboard</h1>
          <nav className="space-x-4">
            {isLoggedIn && (
              <>
                <Button variant="ghost" asChild className="text-white hover:bg-blue-600">
                  <Link to="/admin/dashboard">Dashboard</Link>
                </Button>
                <Button variant="ghost" asChild className="text-white hover:bg-blue-600">
                  <Link to="/admin/users">Usuários</Link>
                </Button>
                <Button variant="ghost" asChild className="text-white hover:bg-blue-600">
                  <Link to="/admin/restaurants">Restaurantes</Link>
                </Button>
                <Button variant="ghost" asChild className="text-white hover:bg-blue-600">
                  <Link to="/">Sair da Área Admin</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-grow container mx-auto p-4">
        {children} {/* Isso renderizará o Outlet */}
      </main>
      <footer className="bg-blue-800 text-white p-4 text-center">
        <p>&copy; {new Date().getFullYear()} FoodApp Admin. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};

export default AdminLayout;