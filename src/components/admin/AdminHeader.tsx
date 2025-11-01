"use client";

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut, Settings } from 'lucide-react';
import { useAuthData } from '@/context/AuthContext';

const AdminHeader: React.FC = () => {
  const { signOut } = useAuthData();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/admin/login');
  };

  return (
    <header className="bg-[#022D68] text-white p-4 shadow-md flex justify-between items-center">
      <Link to="/admin/dashboard" className="text-2xl font-bold">Admin Dashboard</Link>
      <nav className="flex items-center space-x-4">
        <Button variant="ghost" className="text-white hover:bg-[#E47948]" asChild>
          <Link to="/admin/settings">
            <Settings className="h-5 w-5 mr-2" /> Configurações
          </Link>
        </Button>
        <Button variant="ghost" className="text-white hover:bg-red-500" onClick={handleLogout}>
          <LogOut className="h-5 w-5 mr-2" /> Sair
        </Button>
      </nav>
    </header>
  );
};

export default AdminHeader;