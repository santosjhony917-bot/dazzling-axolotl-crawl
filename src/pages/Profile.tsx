import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { User, LogOut } from 'lucide-react';

export default function Profile() {
  const navigate = useNavigate();
  // Corrigido: useAuth agora exporta signOut
  const { signOut, user } = useAuth(); 

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="p-4 max-w-md mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-[#022D68] flex items-center">
        <User className="w-7 h-7 mr-3 text-[#E47948]" />
        Meu Perfil
      </h1>
      
      <div className="bg-white p-6 rounded-lg shadow space-y-3">
        <p className="text-lg font-semibold">Usuário Logado:</p>
        <p className="text-gray-700 break-all">ID: {user?.id}</p>
        <p className="text-gray-700">Email: {user?.email}</p>
      </div>

      <Button 
        onClick={handleLogout} 
        variant="destructive" 
        className="w-full"
      >
        <LogOut className="w-5 h-5 mr-2" />
        Sair
      </Button>
    </div>
  );
}