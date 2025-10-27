import React from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Profile: React.FC = () => {
  const { user, profile, signOut, isLoading } = useAuthContext();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Usuário';

  return (
    <div className="p-4 pt-10 min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
          <User className="w-7 h-7 mr-2 text-primary" /> Meu Perfil
        </h1>

        <Card className="shadow-soft-md dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="text-xl dark:text-white">Informações da Conta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-lg font-semibold dark:text-gray-200">{fullName}</p>
            <p className="text-gray-600 dark:text-gray-400">Email: {user.email}</p>
            <p className="text-gray-600 dark:text-gray-400">ID: {user.id.substring(0, 8)}...</p>
          </CardContent>
        </Card>

        <Button 
          onClick={signOut} 
          variant="destructive" 
          className="w-full shadow-soft-md"
        >
          <LogOut className="w-5 h-5 mr-2" /> Sair
        </Button>
      </div>
    </div>
  );
};

export default Profile;