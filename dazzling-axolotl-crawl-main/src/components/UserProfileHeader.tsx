import React from 'react';
import { ArrowLeft, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';

interface UserProfileHeaderProps {
  displayName: string;
  email: string;
  onBack: () => void;
}

const UserProfileHeader: React.FC<UserProfileHeaderProps> = ({ displayName, email, onBack }) => {
  return (
    <div className="relative bg-primary text-white p-6 pb-10 shadow-soft-xl rounded-b-2xl">
      {/* Botão Voltar */}
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={onBack} 
        className="absolute top-4 left-4 text-white hover:bg-white/20 rounded-lg"
      >
        <ArrowLeft className="w-6 h-6" />
      </Button>

      {/* Informações do Usuário */}
      <div className="flex flex-col items-center pt-8">
        {/* Placeholder para Avatar/Ícone */}
        <div className="size-20 rounded-full bg-white/20 flex items-center justify-center mb-3 border-4 border-white/30">
          <User className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-2xl font-extrabold truncate max-w-full px-4">{displayName}</h1>
        <p className="text-sm opacity-80 mt-1">{email}</p>
      </div>
    </div>
  );
};

export default UserProfileHeader;