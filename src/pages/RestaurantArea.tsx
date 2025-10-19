import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Utensils, ChevronRight, Plus, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils/url';

// Componente auxiliar para os cards de ação
interface ActionCardProps {
  title: string;
  description: string;
  icon: React.ElementType<any>;
  iconColor: string;
  bgColor: string;
  textColor: string;
  onClick: () => void;
}

const ActionCard: React.FC<ActionCardProps> = ({
  title,
  description,
  icon: Icon,
  iconColor,
  bgColor,
  textColor,
  onClick,
}) => {
  return (
    <div 
      className={`flex items-center gap-4 p-4 rounded-lg shadow-sm cursor-pointer transition-all hover:shadow-md ${bgColor}`}
      onClick={onClick}
    >
      <div className="flex flex-col justify-center text-left flex-grow">
        <p className={`text-base font-medium leading-normal line-clamp-1 ${textColor}`}>{title}</p>
        <p className={`text-sm font-normal leading-normal line-clamp-2 ${textColor}/70`}>{description}</p>
      </div>
      <div className="shrink-0">
        <div className={`flex size-7 items-center justify-center ${iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};


export default function RestaurantArea() {
  const navigate = useNavigate();

  const handleBack = () => navigate(-1);
  const handleGoHome = () => navigate(createPageUrl('welcome'));
  
  // Ações de navegação
  const handleClaimRestaurant = () => navigate(createPageUrl('restaurant-login')); // Login é o primeiro passo para reivindicar/acessar
  const handleRegisterRestaurant = () => navigate(createPageUrl('restaurant-signup'));
  const handleEmailLogin = () => navigate(createPageUrl('restaurant-login'));

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-[#f5f7f8] font-sans antialiased">
      <header className="flex items-center p-4 pb-2 justify-between bg-[#f5f7f8]">
        <Button variant="ghost" size="icon" onClick={handleBack} className="text-[#022D68] hover:bg-[#022D68]/5">
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div className="flex items-center gap-1">
          <MapPin className="text-[#022D68] w-6 h-6" />
          <h2 className="text-[#022D68] text-xl font-bold leading-tight tracking-[-0.015em]">FilterFood</h2>
        </div>
        <div className="size-12 shrink-0"></div>
      </header>

      <main className="flex-grow flex flex-col items-center px-4 pt-8 pb-4 text-center">
        <div className="flex items-center justify-center size-24 bg-[#022D68]/10 rounded-full mb-6">
          <Utensils className="text-[#022D68] w-10 h-10" />
        </div>
        <h1 className="text-[#022D68] tracking-light text-3xl font-bold leading-tight">Área do Restaurante</h1>
        <p className="text-gray-600 text-base font-normal leading-normal pt-1">Gerencie seu estabelecimento</p>
        
        <div className="w-full max-w-md mt-10 space-y-4">
          
          {/* Reivindicar restaurante */}
          <ActionCard
            title="Reivindicar restaurante"
            description="Atualizar cardápio e acesso"
            icon={ChevronRight}
            iconColor="text-white"
            bgColor="bg-[#E47948]"
            textColor="text-white"
            onClick={handleClaimRestaurant}
          />

          {/* Cadastrar restaurante */}
          <ActionCard
            title="Cadastrar restaurante"
            description="Conquiste mais clientes"
            icon={Plus}
            iconColor="text-[#022D68]"
            bgColor="bg-white"
            textColor="text-gray-800"
            onClick={handleRegisterRestaurant}
          />

          {/* Login com e-mail */}
          <ActionCard
            title="Login com e-mail"
            description="Acesse o seu perfil"
            icon={Mail}
            iconColor="text-[#022D68]"
            bgColor="bg-white"
            textColor="text-gray-800"
            onClick={handleEmailLogin}
          />
        </div>
      </main>

      <footer className="p-4 pt-8">
        <button 
          onClick={handleGoHome}
          className="text-[#022D68] text-center block text-base font-medium leading-normal w-full hover:underline"
        >
          Voltar para o início
        </button>
      </footer>
    </div>
  );
}