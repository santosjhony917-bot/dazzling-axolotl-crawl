"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuthData } from '@/context/AuthContext';
import { User, LogOut } from 'lucide-react';

interface HeaderProps {
  title?: string; // Adicionando title como opcional
}

const Header: React.FC<HeaderProps> = ({ title = "FoodApp" }) => {
  const { isAuthenticated, signOut } = useAuthData();

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <header className="bg-[#022D68] text-white p-4 shadow-md flex justify-between items-center">
      <Link to="/" className="text-2xl font-bold">{title}</Link>
      <nav className="flex items-center space-x-4">
        {isAuthenticated ? (
          <>
            <Button variant="ghost" className="text-white hover:bg-[#E47948]" asChild>
              <Link to="/profile">
                <User className="h-5 w-5 mr-2" /> Perfil
              </Link>
            </Button>
            <Button variant="ghost" className="text-white hover:bg-red-500" onClick={handleLogout}>
              <LogOut className="h-5 w-5 mr-2" /> Sair
            </Button>
          </>
        ) : (
          <Button variant="ghost" className="text-white hover:bg-[#E47948]" asChild>
            <Link to="/auth">Entrar</Link>
          </Button>
        )}
      </nav>
    </header>
  );
};

export default Header;