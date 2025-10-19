import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
      className={`flex items-center justify-between p-5 rounded-2xl shadow-md cursor-pointer transition-all hover:shadow-lg ${bgColor}`}
      onClick={onClick}
    >
      <div className="flex flex-col justify-center text-left flex-grow pr-4">
        <p className={`text-lg font-semibold leading-snug line-clamp-1 ${textColor}`}>{title}</p>
        {/* Removendo /80 para garantir que a descrição seja totalmente branca quando textColor for branco */}
        <p className={`text-sm font-normal leading-normal line-clamp-2 ${textColor} mt-0.5`}>{description}</p>
      </div>
      <div className="shrink-0">
        <div className={`flex size-6 items-center justify-center ${iconColor}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};

// Componente de Cabeçalho
const RestaurantAreaHeader = ({ navigate }: { navigate: ReturnType<typeof useNavigate> }) => (
  <header className="sticky top-0 z-10 bg-[#f5f7f8] w-full border-b border-gray-100">
    <div className="flex items-center justify-between px-4 py-3 max-w-md mx-auto">
      <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-[#022D68] hover:bg-[#022D68]/5">
        <ArrowLeft className="h-6 w-6" />
      </Button>
      <div className="flex items-center gap-1">
        <MapPin className="text-[#022D68] w-5 h-5" />
        <h2 className="text-[#022D68] text-xl font-bold leading-tight tracking-[-0.015em]">FilterFood</h2>
      </div>
      <div className="size-10 shrink-0"></div> {/* Placeholder para centralização */}
    </div>
  </header>
);


export default function RestaurantArea() {
  const navigate = useNavigate();

  const handleGoHome = () => navigate(createPageUrl('welcome'));
  
  // Ações de navegação
  const handleLogin = () => navigate(createPageUrl('restaurant-login'));
  const handleRegisterRestaurant = () => navigate(createPageUrl('restaurant-signup'));

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-[#f5f7f8] font-sans antialiased">
      
      <RestaurantAreaHeader navigate={navigate} />

      <main className="flex-grow flex flex-col items-center px-4 pt-8 pb-4 w-full max-w-md mx-auto">
        
        {/* Icon and Title */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full text-center mb-10"
        >
          <div className="flex items-center justify-center size-24 bg-[#022D68]/10 rounded-full mx-auto mb-6">
            <Utensils className="text-[#022D68] w-10 h-10" />
          </div>
          <h1 className="text-[#022D68] tracking-tight text-3xl font-bold leading-tight">Área do Restaurante</h1>
          <p className="text-gray-600 text-base font-normal leading-normal pt-1">Gerencie seu estabelecimento</p>
        </motion.div>
        
        {/* Action Cards */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="w-full space-y-4"
        >
          
          {/* Acessar conta (Destaque Laranja) */}
          <ActionCard
            title="Acessar minha conta"
            description="Login com e-mail e senha"
            icon={ChevronRight}
            iconColor="text-white"
            bgColor="bg-[#E47948]"
            textColor="text-white"
            onClick={handleLogin}
          />

          {/* Cadastrar restaurante */}
          <ActionCard
            title="Cadastrar novo restaurante"
            description="Crie uma conta para seu estabelecimento"
            icon={Plus}
            iconColor="text-[#022D68]"
            bgColor="bg-white"
            textColor="text-[#022D68]"
            onClick={handleRegisterRestaurant}
          />
          
          {/* Reivindicar restaurante existente */}
          <ActionCard
            title="Reivindicar restaurante existente"
            description="Atualizar cardápio e acesso"
            icon={Mail}
            iconColor="text-[#022D68]"
            bgColor="bg-white"
            textColor="text-[#022D68]"
            onClick={handleLogin}
          />
        </motion.div>
      </main>

      {/* Footer */}
      <motion.footer 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="p-4 pt-8 w-full max-w-md mx-auto"
      >
        <button 
          onClick={handleGoHome}
          className="text-[#022D68] text-center block text-base font-medium leading-normal w-full hover:underline"
        >
          Voltar para o início
        </button>
      </motion.footer>
    </div>
  );
}