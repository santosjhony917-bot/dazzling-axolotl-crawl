import React from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, User as UserIcon } from 'lucide-react';

const Profile: React.FC = () => {
  const { user, profile, signOut } = useAuthContext();

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-[#022D68] mb-6">Meu Perfil</h1>
      
      <div className="bg-white p-6 rounded-xl shadow-md space-y-4">
        <div className="flex items-center space-x-4">
          <div className="size-12 rounded-full bg-gray-200 flex items-center justify-center">
            <UserIcon className="w-6 h-6 text-gray-500" />
          </div>
          <div>
            <p className="font-semibold text-lg">{profile?.first_name || 'Usuário'}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>
        
        <Button 
          onClick={signOut} 
          variant="destructive" 
          className="w-full mt-4"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
      </div>
    </div>
  );
};

export default Profile;